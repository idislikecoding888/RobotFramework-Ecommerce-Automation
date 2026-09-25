*** Settings ***
Test Setup        Open Application
Test Teardown     Cleanup Test
Resource          ../resources/registration_page.resource
Resource          ../resources/test_data.resource
Resource          ../resources/login_page.resource
Resource          ../resources/products_page.resource
Resource          ../resources/cart_page.resource
Resource          ../resources/common.resource
Resource          ../resources/advanced_ecommerce.resource

*** Test Cases ***
TC01 - Verify Login
    Login To Application
    Verify User Is Logged In

TC02 - Verify Product Search
    Login To Application
    Search For Product

TC03 - Verify Product Can Be Added To Cart
    Login To Application
    Search For Product
    Add Product To Cart
    Open Cart
    Verify Product In Cart

TC04 - Complete E-Commerce User Journey
    Login To Application
    Search For Product
    Add Product To Cart
    Open Cart
    Verify Product In Cart
    Logout From Application

TC05 - Register New User
    Generate Unique Registration Data
    Register New User
    Verify Account Created
    Continue After Registration
    Verify User Is Logged In

TC06 - Data Driven Product Search
    [Template]    Search Product With Data
    Men Tshirt
    Blue Top
    Sleeveless Dress

TC07 - Invalid Login
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Login With Invalid Credentials
    Verify Invalid Login Message


TC08 - Logout User
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Login To Application
    Verify User Is Logged In
    Logout User
    Verify Login Page After Logout


TC09 - Verify Product Details Page
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Open First Product Details
    Verify Product Details


TC10 - Verify Home Page Subscription
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Go To    ${BASE_URL}
    Wait Until Page Contains    SUBSCRIPTION    30 seconds
    Subscribe With Unique Email
    Verify Subscription Successful


TC11 - Add Multiple Products To Cart
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products
    Wait Until Element Is Visible    ${ADD_TO_CART_BUTTON}    30 seconds

    Add Product By Id    1
    Continue Shopping From Modal

    Add Product By Id    2
    Open Cart From Modal

    Verify Multiple Products In Cart


TC12 - Verify Product Quantity In Cart
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Add Product With Quantity    4
    Verify Cart Quantity          4


TC13 - Remove Product From Cart
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products

    Add Product By Id    2
    Open Cart From Modal

    Remove Men Tshirt From Cart


TC14 - Verify Category Navigation
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Open Women Tops Category
    Open Men Tshirts Category


TC15 - Verify Brand Navigation
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Open HM Brand
    Open Polo Brand


TC16 - Verify Cart Persistence After Login
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Search For Product
    Add Product To Cart
    Verify User Is Not Logged In
    Verify Searched Product Is In Cart After Login


TC17 - Add Product Review
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Add Product Review
    Verify Product Review Submitted


TC18 - Add Recommended Product To Cart
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Add Recommended Product To Cart
    Verify Recommended Product In Cart

*** Keywords ***
Cleanup Test
    Run Keyword If    '${TEST STATUS}' == 'FAIL'    Capture Page Screenshot
    Close Application