import SharedSignUpPage from "../../../wrs-marketplace/src/pages/SignUpPage";
import teaSignInImage from "@assets/pexels-abellpaul53-7427928_1788340904358.jpg";

export default function SignUpPage() {
  return (
    <SharedSignUpPage
      marketName="Tea Marketplace"
      marketDescription="traceable specialty tea"
      backgroundSrc={teaSignInImage}
      shellClass="market-auth-shell--tea"
      benefitEyebrow="Tea sourcing desk · 03"
      benefitSlides={[
        {
          eyebrow: "Traceable gardens",
          title: "Know the garden\nbehind the leaf.",
          description: "Review origin, grade, processing, and available volume before you commit to a tea lot.",
          accentWords: ["garden", "leaf", "origin", "grade", "tea lot"],
        },
        {
          eyebrow: "Fairer trade",
          title: "Move tea\nwith confidence.",
          description: "Connect verified growers, buyers, and finance around a clearer East African tea supply chain.",
          accentWords: ["tea", "confidence", "verified growers", "finance"],
        },
        {
          eyebrow: "Market visibility",
          title: "Buy with a record,\nnot a promise.",
          description: "Compare verified tea supply with the provenance and quality records serious buyers need.",
          accentWords: ["record", "promise", "verified tea", "provenance", "quality"],
        },
      ]}
    />
  );
}