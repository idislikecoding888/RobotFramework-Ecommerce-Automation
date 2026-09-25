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
    Wait Until Location Is    ${BASE_URL}/

    Execute Javascript
    ...    window.scrollTo(0, document.body.scrollHeight);

    Wait Until Element Is Visible    id=susbscribe_email    30 seconds

    ${timestamp}=    Get Current Date    result_format=%Y%m%d%H%M%S
    ${email}=        Set Variable    robot.subscription.${timestamp}@example.com

    Input Text       id=susbscribe_email    ${email}
    Click Element    id=subscribe

    Wait Until Page Contains
    ...    You have been successfully subscribed!
    ...    20 seconds


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


TC14 - Verify No Results For Invalid Product Search
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products    30 seconds

    Wait Until Element Is Visible    ${SEARCH_BOX}    30 seconds
    Remove Advertisement Overlays

    Input Text    ${SEARCH_BOX}    RobotProductDoesNotExist999
    Click Element    ${SEARCH_BUTTON}

    Wait Until Location Contains    /products?search=    30 seconds

    ${product_count}=    Get Element Count    css=div.product-image-wrapper

    Should Be Equal As Integers    ${product_count}    0


TC15 - Verify Cart Total Price Calculation
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Add Product With Quantity    2

    Go To    ${BASE_URL}/view_cart
    Wait Until Location Contains    /view_cart    30 seconds

    Wait Until Element Is Visible    ${CART_PRODUCT_ROWS}    30 seconds
    Wait Until Element Is Visible    ${CART_UNIT_PRICE}       15 seconds
    Wait Until Element Is Visible    ${CART_TOTAL_PRICE}      15 seconds

    ${unit_text}=    Get Text    ${CART_UNIT_PRICE}
    ${total_text}=   Get Text    ${CART_TOTAL_PRICE}

    ${unit_price}=    Evaluate    int($unit_text.replace('Rs. ', '').replace(',', ''))
    ${total_price}=   Evaluate    int($total_text.replace('Rs. ', '').replace(',', ''))
    ${expected_total}=    Evaluate    ${unit_price} * 2

    Should Be Equal As Integers    ${total_price}    ${expected_total}


TC16 - Verify Cart Persistence After Login
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Search For Product
    Add Product To Cart
    Open Cart From Modal

    Wait Until Location Contains    /view_cart    30 seconds
    Wait Until Element Is Visible    ${CART_PRODUCT}    30 seconds

    ${product_before_login}=    Get Text    ${CART_PRODUCT}
    Should Be Equal As Strings    ${product_before_login}    Men Tshirt

    Remove Advertisement Overlays
    Click Element    ${LOGIN_LINK}

    Wait Until Element Is Visible    ${EMAIL_FIELD}    30 seconds
    Remove Advertisement Overlays

    Input Text    ${EMAIL_FIELD}       ${VALID_EMAIL}
    Input Text    ${PASSWORD_FIELD}    ${VALID_PASSWORD}

    Remove Advertisement Overlays
    Click Element    ${LOGIN_BUTTON}

    Wait Until Element Is Visible    ${LOGGED_IN_TEXT}    30 seconds

    Go To    ${BASE_URL}/view_cart
    Wait Until Location Contains    /view_cart    30 seconds

    Wait Until Element Is Visible    ${CART_PRODUCT}    30 seconds

    ${product_after_login}=    Get Text    ${CART_PRODUCT}

    Should Be Equal As Strings
    ...    ${product_after_login}
    ...    ${product_before_login}


TC17 - Add Product Review
    [Setup]       Open Application
    [Teardown]    Cleanup Test
    Remove Advertisement Overlays
    Add Product Review
    Verify Product Review Submitted
    Remove Advertisement Overlays


TC18 - Add Recommended Product To Cart
    [Setup]       Open Application
    [Teardown]    Cleanup Test

    Add Recommended Product To Cart
    Verify Recommended Product In Cart

*** Keywords ***
Cleanup Test
    Run Keyword If    '${TEST STATUS}' == 'FAIL'    Capture Page Screenshot
    Close Application