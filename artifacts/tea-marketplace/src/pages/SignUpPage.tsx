import SharedSignUpPage from "../../../wrs-marketplace/src/pages/SignUpPage";
import teaSignInImage from "@assets/images_(28)_1788267884985.jpg";

export default function SignUpPage() {
  return (
    <SharedSignUpPage
      marketName="Tea Marketplace"
      marketDescription="traceable specialty tea"
      backgroundSrc={teaSignInImage}
      shellClass="market-auth-shell--tea"
    />
  );
}