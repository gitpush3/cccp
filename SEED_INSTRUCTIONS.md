# Code Database Seeding Instructions

Run these commands to populate the full Cuyahoga County code database:

## Quick Start (One Command)

```bash
npx convex run seedAllMunicipalities:seedEverything
```

This seeds:
- 6 Ohio State codes (building, residential, electrical, plumbing, mechanical, fire)
- 4 County codes (land bank, tax, recording, health)
- ~200 municipality codes for all 59 Cuyahoga municipalities

## Additional Seeds

```bash
# Detailed code content for major cities
npx convex run seedData:seedCodeContent

# POS requirements for 24 cities
npx convex run seedData:seedPOSRequirements

# Land use codes
npx convex run seedData:seedLandUseCodes
```

## Verify Coverage

After seeding, verify everything is loaded:

```bash
npx convex run codeContent:verifyCoverage
```

Expected output:
- 61 municipalities (59 + Ohio State + Cuyahoga County)
- ~250+ total code entries
- 24 POS requirement entries

## New LLM Tools Available

After seeding, these tools work best:

| Tool | Use For |
|------|---------|
| `getInvestorBriefing` | "Tell me about investing in [city]" |
| `quickAnswer` | Fast yes/no questions (POS, permits, Airbnb) |
| `getPermitRequirements` | "Do I need a permit for [work type]?" |
| `compareCodes` | Compare cities side-by-side |
| `answerCodeQuestion` | General code questions |
