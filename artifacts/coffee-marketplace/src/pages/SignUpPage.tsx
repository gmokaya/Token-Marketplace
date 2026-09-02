import SharedSignUpPage from "../../../wrs-marketplace/src/pages/SignUpPage";
import coffeeSignInImage from "@assets/pexels-1500mcoffee-29639326_1788340936508.jpg";

export default function SignUpPage() {
  return (
    <SharedSignUpPage
      marketName="Coffee Marketplace"
      marketDescription="traceable specialty coffee"
      backgroundSrc={coffeeSignInImage}
      shellClass="market-auth-shell--coffee"
      benefitEyebrow="Coffee sourcing desk · 03"
      benefitSlides={[
        {
          eyebrow: "Traceable lots",
          title: "Know the farm\nbehind the cup.",
          description: "Review origin, grade, processing, and available volume before you commit to a coffee lot.",
          accentWords: ["farm", "cup", "origin", "grade", "coffee lot"],
        },
        {
          eyebrow: "Fairer trade",
          title: "Move coffee\nwith confidence.",
          description: "Connect verified producers, buyers, and finance around a clearer specialty coffee supply chain.",
          accentWords: ["coffee", "confidence", "verified producers", "finance"],
        },
        {
          eyebrow: "Market visibility",
          title: "Buy with a record,\nnot a promise.",
          description: "Compare East African coffee supply with the provenance and quality records serious buyers need.",
          accentWords: ["record", "promise", "East African coffee", "provenance", "quality"],
        },
      ]}
    />
  );
}