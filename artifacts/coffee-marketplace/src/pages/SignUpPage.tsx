import SharedSignUpPage from "../../../wrs-marketplace/src/pages/SignUpPage";
import coffeeSignInImage from "@assets/dang-cong-JqF4IS65xEg-unsplash_1788267949650.jpg";

export default function SignUpPage() {
  return (
    <SharedSignUpPage
      marketName="Coffee Marketplace"
      marketDescription="traceable specialty coffee"
      backgroundSrc={coffeeSignInImage}
      shellClass="market-auth-shell--coffee"
    />
  );
}