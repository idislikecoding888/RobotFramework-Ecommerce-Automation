export type TestStatus = "passed" | "failed" | "running" | "ready";

// Temporary target for the current Automation Exercise capstone.
// The backend will make this configurable for universal testing.
export const DEFAULT_TARGET_URL = "https://automationexercise.com";

export type TestCase = {
  id: string;
  name: string;
  suite: string;
  type: string;
  duration: string;
  status: TestStatus;
  description: string;
};

export const tests: TestCase[] = [
  { id: "TC01", name: "Verify Login", suite: "Authentication", type: "functional", duration: "2.4s", status: "passed", description: "Valid credentials + logged-in state verification." },
  { id: "TC02", name: "Verify Product Search", suite: "Product Discovery", type: "functional", duration: "1.8s", status: "passed", description: "Searches the catalog and verifies matching results." },
  { id: "TC03", name: "Verify Product Can Be Added To Cart", suite: "Cart", type: "functional", duration: "3.1s", status: "passed", description: "Adds Men Tshirt and verifies it appears in the cart." },
  { id: "TC04", name: "Complete E-Commerce User Journey", suite: "Checkout", type: "e2e", duration: "24.8s", status: "passed", description: "Login → search → cart → logout journey." },
  { id: "TC05", name: "Register New User", suite: "Account", type: "functional", duration: "12.1s", status: "failed", description: "Creates a fresh account with generated registration data." },
  { id: "TC06", name: "Data Driven Product Search", suite: "Product Discovery", type: "data-driven", duration: "8.4s", status: "passed", description: "Runs product search against multiple data rows." },
  { id: "TC07", name: "Invalid Login", suite: "Authentication", type: "negative", duration: "1.9s", status: "passed", description: "Verifies invalid credentials show the expected error." },
  { id: "TC08", name: "Logout User", suite: "Authentication", type: "functional", duration: "1.5s", status: "passed", description: "Logs out and verifies the login screen is available." },
  { id: "TC09", name: "Verify Product Details Page", suite: "Product Discovery", type: "catalog", duration: "2.6s", status: "passed", description: "Checks product details and SKU information." },
  { id: "TC10", name: "Verify Home Page Subscription", suite: "Engagement", type: "newsletter", duration: "2.1s", status: "passed", description: "Submits the footer subscription form." },
  { id: "TC11", name: "Add Multiple Products To Cart", suite: "Cart", type: "functional", duration: "5.2s", status: "passed", description: "Adds multiple catalog items and verifies the cart." },
  { id: "TC12", name: "Verify Product Quantity In Cart", suite: "Cart", type: "functional", duration: "3.4s", status: "passed", description: "Adds a product with quantity and verifies the cart quantity." },
  { id: "TC13", name: "Remove Product From Cart", suite: "Cart", type: "functional", duration: "2.8s", status: "passed", description: "Removes Men Tshirt from the cart." },
  { id: "TC14", name: "Verify No Results For Invalid Product Search", suite: "Product Discovery", type: "negative", duration: "1.6s", status: "passed", description: "Searches a nonsensical term and verifies zero products." },
  { id: "TC15", name: "Verify Cart Total Price Calculation", suite: "Cart", type: "pricing", duration: "4.1s", status: "passed", description: "Checks line total equals unit price × quantity." },
  { id: "TC16", name: "Verify Cart Persistence After Login", suite: "Cart", type: "session", duration: "6.7s", status: "passed", description: "Keeps a cart item available through a login transition." },
  { id: "TC17", name: "Add Product Review", suite: "Engagement", type: "reviews", duration: "9.3s", status: "failed", description: "Fills and submits the verified product review form." },
  { id: "TC18", name: "Add Recommended Product To Cart", suite: "Cart", type: "upsell", duration: "3.9s", status: "passed", description: "Adds a product from the recommended-items area." },
];

export const failureDetails = {
  TC05: {
    title: "Register New User",
    exception: "ElementNotFoundException",
    short: 'The post-registration locator for "Logged in as" was not visible before the timeout.',
    target: 'xpath=//*[contains(text(),"Logged in as")]',
    expected: "After account creation and Continue, the authenticated home state is visible.",
    actual: "Account Created! passed, but the logged-in marker was not visible within the wait window.",
    keyword: "Verify User Is Logged In",
    fix: "Harden the post-registration wait / redirect verification instead of relying on a single element visibility check.",
    code: `Verify User Is Logged In\n    Remove Advertisement Overlays\n    Wait Until Element Is Visible    ${"${LOGGED_IN_TEXT}"}\n    Page Should Contain    Logged in as`,
    screenshot: "Registration failure screenshot captured by Robot Framework on failure.",
  },
  TC17: {
    title: "Add Product Review",
    exception: "ElementClickInterceptedException",
    short: "The review submit button was intercepted by a dynamically injected Google ad overlay.",
    target: "id=button-review",
    expected: "The review submit button receives the click and the success message appears.",
    actual: "Another full-screen overlay received the pointer event at the target coordinates.",
    keyword: "Click Review Button",
    fix: "Remove/wait out the ad overlay before interacting with the review submit button; JS click can be used as a fallback.",
    code: `Click Review Button\n    Remove Advertisement Overlays\n    Scroll Element Into View    ${"${REVIEW_SUBMIT_BUTTON}"}\n    Wait Until Element Is Visible    ${"${REVIEW_SUBMIT_BUTTON}"}`,
    screenshot: "review_overlay_intercept.png — captured during the failed click interaction.",
  },
} as const;

export const recentRuns = [
  { id: "#184519", passed: 16, failed: 2, duration: "42.8s", age: "14m ago", status: "FAILED" },
  { id: "#184518", passed: 18, failed: 0, duration: "1m 58s", age: "3h ago", status: "PASSED" },
  { id: "#184517", passed: 18, failed: 0, duration: "2m 06s", age: "7h ago", status: "PASSED" },
];

export const terminalLines = [
  "> robot tests/ecommerce_tests.robot",
  "> Initializing SeleniumLibrary... [OK]",
  "> Chrome session ready [OK]",
  "> Running 18 tests...",
  "> TC01...TC04 [PASS]",
  "> TC05... [FAIL] ElementNotFoundException",
  "> TC06...TC16 [PASS]",
  "> TC17... [FAIL] ElementClickInterceptedException",
  "> TC18... [PASS]",
  "> RESULT: 16 passed, 2 failed in 42.8s",
];
