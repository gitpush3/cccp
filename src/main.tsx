import { createRoot } from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ClerkProvider 
    publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
    appearance={{
      variables: {
        colorPrimary: "#DA291C",
        colorTextOnPrimaryBackground: "white",
      },
      layout: {
        socialButtonsVariant: "iconButton",
      }
    }}
  >
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>,
);
