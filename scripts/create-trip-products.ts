import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Convex URL for pushing trip data
const CONVEX_URL = process.env.CONVEX_URL || '';
const CONVEX_DEPLOY_KEY = process.env.CONVEX_DEPLOY_KEY || '';

// ============================================================
// TRIP CONFIGURATION - EDIT THIS FOR EACH NEW TRIP
// ============================================================

const tripConfig = {
  tripId: "caribbean-2026",
  tripName: "Caribbean Escape 2026",
  travelDate: "2026-06-01",

  packages: [
    { name: "Bronze", single: 2500, double: 4000, triple: 5500, deposit: 300 },
    { name: "Silver", single: 3000, double: 5000, triple: 7000, deposit: 400 },
    { name: "Gold", single: 3500, double: 6000, triple: 8500, deposit: 500 },
    { name: "Platinum", single: 4500, double: 8000, triple: 11000, deposit: 750 },
  ],
};

// ============================================================
// SCRIPT - DO NOT EDIT BELOW
// ============================================================

const mode = process.env.STRIPE_MODE || 'test';
const stripeKey = mode === 'live'
  ? process.env.STRIPE_LIVE_SECRET_KEY!
  : process.env.STRIPE_TEST_SECRET_KEY!;

const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' as any });

interface PackageConfig {
  name: string;
  single: number;
  double: number;
  triple: number;
  deposit: number;
}

interface CreatedPrice {
  priceId: string;
  paymentLinkId: string;
  paymentLinkUrl: string;
  amount: number;
}

interface PackagePrices {
  single: CreatedPrice;
  double: CreatedPrice;
  triple: CreatedPrice;
  deposit: CreatedPrice;
}

interface TripOutput {
  tripId: string;
  tripName: string;
  travelDate: string;
  stripeProductId: string;
  packages: Record<string, PackagePrices>;
  createdAt: string;
  mode: string;
}

async function createTripProducts() {
  console.log(`\n🚀 Creating Stripe products for: ${tripConfig.tripName}`);
  console.log(`   Mode: ${mode.toUpperCase()}\n`);

  // 1. Create the main Product
  const product = await stripe.products.create({
    name: tripConfig.tripName,
    description: `Travel Date: ${tripConfig.travelDate}`,
    metadata: {
      trip_id: tripConfig.tripId,
      travel_date: tripConfig.travelDate,
    },
  });

  console.log(`✅ Created product: ${product.id}\n`);

  const output: TripOutput = {
    tripId: tripConfig.tripId,
    tripName: tripConfig.tripName,
    travelDate: tripConfig.travelDate,
    stripeProductId: product.id,
    packages: {},
    createdAt: new Date().toISOString(),
    mode,
  };

  // 2. Create prices and payment links for each package
  for (const pkg of tripConfig.packages) {
    console.log(`📦 Creating prices for ${pkg.name}...`);

    output.packages[pkg.name.toLowerCase()] = {
      single: await createPriceWithLink(product.id, pkg, 'single', 1),
      double: await createPriceWithLink(product.id, pkg, 'double', 2),
      triple: await createPriceWithLink(product.id, pkg, 'triple', 3),
      deposit: await createDepositPriceWithLink(product.id, pkg),
    };
  }

  // 3. Save output
  const outputDir = path.join(__dirname, '..', 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${tripConfig.tripId}-products.json`);
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // 4. Push to Convex
  await pushToConvex(output);

  // 5. Print summary
  printSummary(output);

  console.log(`\n📁 Product mapping saved to: ${outputPath}\n`);
}

async function pushToConvex(tripData: TripOutput): Promise<void> {
  if (!CONVEX_URL) {
    console.log('⚠️  CONVEX_URL not set, skipping Convex push. Add to .env to enable.');
    return;
  }

  console.log('\n📤 Pushing trip data to Convex...');

  const convexPayload = {
    tripId: tripData.tripId,
    tripName: tripData.tripName,
    travelDate: new Date(tripData.travelDate).getTime(),
    stripeProductId: tripData.stripeProductId,
    packages: tripData.packages,
    mode: tripData.mode,
    createdAt: Date.now(),
  };

  try {
    // Call Convex HTTP endpoint to upsert trip
    const response = await fetch(`${CONVEX_URL}/api/trips/upsert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(CONVEX_DEPLOY_KEY && { 'Authorization': `Bearer ${CONVEX_DEPLOY_KEY}` }),
      },
      body: JSON.stringify(convexPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Convex responded with ${response.status}: ${errorText}`);
    }

    console.log('✅ Trip data pushed to Convex successfully!');
  } catch (error: any) {
    console.error('❌ Failed to push to Convex:', error.message);
    console.log('   You can manually import the JSON file later.');
  }
}

async function createPriceWithLink(
  productId: string,
  pkg: PackageConfig,
  occupancy: 'single' | 'double' | 'triple',
  occupantCount: number
): Promise<CreatedPrice> {
  const amount = pkg[occupancy];
  const nickname = `${pkg.name} - ${capitalize(occupancy)} (${occupantCount} occupant${occupantCount > 1 ? 's' : ''})`;

  // Create price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: amount * 100,
    currency: 'usd',
    nickname,
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      occupancy,
      occupant_count: occupantCount.toString(),
      deposit_amount: pkg.deposit.toString(),
      travel_date: tripConfig.travelDate,
    },
  });

  // Create payment link with card saving enabled
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: {
      setup_future_usage: 'off_session', // SAVES CARD FOR AUTO-CHARGE
    },
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      occupancy,
      price_id: price.id,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://mybooking.latitudego.com/booking-success?trip=${tripConfig.tripId}&package=${pkg.name.toLowerCase()}&occupancy=${occupancy}`,
      },
    },
  });

  return {
    priceId: price.id,
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.url,
    amount,
  };
}

async function createDepositPriceWithLink(
  productId: string,
  pkg: PackageConfig
): Promise<CreatedPrice> {
  const nickname = `${pkg.name} - Deposit`;

  // Create deposit price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: pkg.deposit * 100,
    currency: 'usd',
    nickname,
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      type: 'deposit',
      travel_date: tripConfig.travelDate,
    },
  });

  // Create payment link for deposit
  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    payment_intent_data: {
      setup_future_usage: 'off_session',
    },
    metadata: {
      trip_id: tripConfig.tripId,
      package: pkg.name.toLowerCase(),
      type: 'deposit',
      price_id: price.id,
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `https://latitudego.com/booking-success?trip=${tripConfig.tripId}&package=${pkg.name.toLowerCase()}&type=deposit`,
      },
    },
  });

  return {
    priceId: price.id,
    paymentLinkId: paymentLink.id,
    paymentLinkUrl: paymentLink.url,
    amount: pkg.deposit,
  };
}

function printSummary(output: TripOutput) {
  console.log('\n');
  console.log('━'.repeat(70));
  console.log(`Payment Links for: ${output.tripName}`);
  console.log('━'.repeat(70));

  for (const [pkgName, prices] of Object.entries(output.packages)) {
    console.log(`\n📦 ${capitalize(pkgName)}`);
    console.log(`   Single ($${prices.single.amount.toLocaleString()}):  ${prices.single.paymentLinkUrl}`);
    console.log(`   Double ($${prices.double.amount.toLocaleString()}):  ${prices.double.paymentLinkUrl}`);
    console.log(`   Triple ($${prices.triple.amount.toLocaleString()}):  ${prices.triple.paymentLinkUrl}`);
    console.log(`   Deposit ($${prices.deposit.amount.toLocaleString()}): ${prices.deposit.paymentLinkUrl}`);
  }

  console.log('\n' + '━'.repeat(70));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Run
createTripProducts().catch(console.error);
