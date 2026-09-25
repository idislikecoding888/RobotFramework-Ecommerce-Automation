*** Settings ***
Test Setup        Open Application
Test Teardown     Cleanup Test
Resource          ../resources/registration_page.resource
Resource          ../resources/test_data.resource
Resource          ../resources/login_page.resource
Resource          ../resources/products_page.resource
Resource          ../resources/cart_page.resource
Resource          ../resources/common.resource

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
    Delete Created Account

TC06 - Data Driven Product Search
    [Template]    Search Product With Data
    Men Tshirt
    Blue Top
    Sleeveless Dress

*** Keywords ***
Cleanup Test
    Run Keyword If    '${TEST STATUS}' == 'FAIL'    Capture Page Screenshot
    Close Application