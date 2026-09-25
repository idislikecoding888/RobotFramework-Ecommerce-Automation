*** Settings ***
Library    SeleniumLibrary
Library    DateTime

Resource    common.resource
Resource    login_page.resource
Resource    products_page.resource
Resource    cart_page.resource
Resource    test_data.resource


*** Variables ***

# General / navigation
${LOGOUT_LOGIN_EMAIL_FIELD}    css=input[data-qa="login-email"]
${LOGOUT_LOGIN_PASSWORD_FIELD}  css=input[data-qa="login-password"]

${CONTINUE_SHOPPING_BUTTON}     css=button.close-modal
${VIEW_CART_BUTTON}             xpath=//u[normalize-space(.)='View Cart']/ancestor::a[1]

# Product details
${FIRST_VIEW_PRODUCT}           xpath=(//a[contains(@href,'/product_details/')])[1]

# Quantity
${PRODUCT_QUANTITY_FIELD}       id=quantity
${CART_QUANTITY_FIELD}          css=input.cart_quantity

# Cart
${CART_PRODUCT_ROWS}            css=tr[id^="product-"]
${CART_REMOVE_BUTTONS}          css=a.cart_quantity_delete

# Subscription
${SUBSCRIPTION_EMAIL}           id=susbscribe_email
${SUBSCRIBE_BUTTON}             id=subscribe
${SUBSCRIPTION_SUCCESS}         xpath=//*[contains(normalize-space(.),'You have been successfully subscribed!')]

# Product review
${REVIEW_NAME_FIELD}            id=name
${REVIEW_EMAIL_FIELD}           id=email
${REVIEW_TEXT_FIELD}            id=review
${REVIEW_SUBMIT_BUTTON}         id=button-review
${REVIEW_SUCCESS_MESSAGE}       xpath=//*[contains(normalize-space(.),'Thank you for your review.')]

${WOMEN_CATEGORY_TOGGLE}       xpath=//div[contains(@class,'category-products')]//a[contains(@href,'#')][contains(normalize-space(.),'Women')]
${MEN_CATEGORY_TOGGLE}          xpath=//div[contains(@class,'category-products')]//a[contains(@href,'#')][contains(normalize-space(.),'Men')]

# Categories
${WOMEN_TOPS_CATEGORY}          xpath=//a[@href='/category_products/2']
${MEN_TSHIRTS_CATEGORY}         xpath=//a[@href='/category_products/3']

# Brands
${HM_BRAND}                     xpath=//a[contains(normalize-space(.),'H&M')]
${POLO_BRAND}                   xpath=//a[contains(normalize-space(.),'Polo')]

# Recommended products
${RECOMMENDED_SECTION}          xpath=//*[contains(@class,'recommended_items')]
${RECOMMENDED_ADD_TO_CART}      xpath=(//*[contains(@class,'recommended_items')]//a[contains(@class,'add-to-cart')])[1]

# Cart product rows
${MEN_TSHIRT_CART_ROW}          xpath=//tr[starts-with(@id,'product-')][.//td[contains(@class,'cart_description')]//*[contains(normalize-space(.),'Men Tshirt')]]
${BLUE_TOP_CART_ROW}             xpath=//tr[starts-with(@id,'product-')][.//td[contains(@class,'cart_description')]//*[contains(normalize-space(.),'Blue Top')]]

# Invalid login
${INVALID_EMAIL}                robot-invalid-user@example.com
${INVALID_PASSWORD}             WrongPassword@123


*** Keywords ***

Login With Invalid Credentials
    Click Element    ${LOGIN_LINK}
    Wait Until Element Is Visible    ${EMAIL_FIELD}    30 seconds
    Remove Advertisement Overlays
    Input Text    ${EMAIL_FIELD}       ${INVALID_EMAIL}
    Input Text    ${PASSWORD_FIELD}    ${INVALID_PASSWORD}
    Scroll Element Into View    ${LOGIN_BUTTON}
    Remove Advertisement Overlays
    ${login_button}=    Get WebElement    ${LOGIN_BUTTON}
    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${login_button}

Verify Invalid Login Message
    Wait Until Page Contains
    ...    Your email or password is incorrect!
    ...    15 seconds


Logout User
    Remove Advertisement Overlays
    Wait Until Element Is Visible    ${LOGOUT_LINK}    30 seconds
    Click Element    ${LOGOUT_LINK}

Verify Login Page After Logout
    Wait Until Element Is Visible    ${EMAIL_FIELD}    30 seconds
    Wait Until Element Is Visible    ${PASSWORD_FIELD}    30 seconds
    Page Should Contain    Login to your account


Open First Product Details
    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products    30 seconds
    Wait Until Element Is Visible    ${FIRST_VIEW_PRODUCT}    30 seconds

    Scroll Element Into View    ${FIRST_VIEW_PRODUCT}
    Remove Advertisement Overlays

    ${product_link}=    Get WebElement    ${FIRST_VIEW_PRODUCT}

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${product_link}

    Wait Until Location Contains    /product_details/    30 seconds
    Wait Until Page Contains    Availability:    30 seconds


Verify Product Details
    Page Should Contain    Availability:
    Page Should Contain    Condition:
    Page Should Contain    Brand:
    Page Should Contain    Write Your Review
    Page Should Contain    Add to cart
    Element Should Be Visible    ${PRODUCT_QUANTITY_FIELD}


Subscribe With Unique Email
    ${timestamp}=    Get Current Date    result_format=%Y%m%d%H%M%S
    ${subscription_email}=    Catenate
    ...    SEPARATOR=
    ...    robot.subscription.${timestamp}@example.com

    Scroll Element Into View    ${SUBSCRIPTION_EMAIL}
    Remove Advertisement Overlays
    Input Text    ${SUBSCRIPTION_EMAIL}    ${subscription_email}
    Click Element    ${SUBSCRIBE_BUTTON}

Verify Subscription Successful
    Wait Until Element Is Visible
    ...    ${SUBSCRIPTION_SUCCESS}
    ...    15 seconds


Add Product By Id
    [Arguments]    ${product_id}

    Remove Advertisement Overlays

    ${button}=    Get WebElement
    ...    xpath=//a[@data-product-id='${product_id}' and contains(@class,'add-to-cart')]

    Execute Javascript
    ...    arguments[0].scrollIntoView({block:'center'});
    ...    ARGUMENTS
    ...    ${button}

    Remove Advertisement Overlays

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${button}

    Wait Until Element Is Visible
    ...    xpath=//*[contains(normalize-space(.),'Your product has been added to cart')]
    ...    15 seconds


Continue Shopping From Modal
    Remove Advertisement Overlays
    Wait Until Element Is Visible    ${CONTINUE_SHOPPING_BUTTON}    15 seconds
    Click Element    ${CONTINUE_SHOPPING_BUTTON}


Open Cart From Modal
    Remove Advertisement Overlays
    Wait Until Element Is Visible    ${VIEW_CART_BUTTON}    15 seconds
    Click Element    ${VIEW_CART_BUTTON}
    Wait Until Location Contains    /view_cart
    Wait Until Element Is Visible    ${CART_PRODUCT_ROWS}    30 seconds


Verify Multiple Products In Cart
    Wait Until Element Is Visible    ${BLUE_TOP_CART_ROW}    15 seconds
    Wait Until Element Is Visible    ${MEN_TSHIRT_CART_ROW}    15 seconds


Add Product With Quantity
    [Arguments]    ${quantity}

    Open First Product Details

    Wait Until Element Is Visible    ${PRODUCT_QUANTITY_FIELD}    15 seconds
    Clear Element Text    ${PRODUCT_QUANTITY_FIELD}
    Input Text    ${PRODUCT_QUANTITY_FIELD}    ${quantity}

    Remove Advertisement Overlays

    ${add_button}=    Get WebElement
    ...    xpath=//*[self::button or self::a][contains(normalize-space(.),'Add to cart')]

    Execute Javascript
    ...    arguments[0].scrollIntoView({block:'center'});
    ...    ARGUMENTS
    ...    ${add_button}

    Remove Advertisement Overlays

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${add_button}

    Wait Until Element Is Visible
    ...    xpath=//*[contains(normalize-space(.),'Your product has been added to cart')]
    ...    15 seconds

    Open Cart From Modal


Verify Cart Quantity
    [Arguments]    ${expected_quantity}

    Wait Until Element Is Visible    ${CART_QUANTITY_FIELD}    15 seconds
    ${actual_quantity}=    Get Element Attribute
    ...    ${CART_QUANTITY_FIELD}
    ...    value

    Should Be Equal As Strings    ${actual_quantity}    ${expected_quantity}


Remove Men Tshirt From Cart
    Wait Until Element Is Visible    ${MEN_TSHIRT_CART_ROW}    15 seconds

    ${remove_button}=    Get WebElement
    ...    xpath=//tr[starts-with(@id,'product-')][.//td[contains(@class,'cart_description')]//*[contains(normalize-space(.),'Men Tshirt')]]//a[contains(@class,'cart_quantity_delete')]

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${remove_button}

    Wait Until Element Is Not Visible
    ...    ${MEN_TSHIRT_CART_ROW}
    ...    15 seconds


Open Women Tops Category
    Go To    ${BASE_URL}
    Wait Until Location Is    ${BASE_URL}/
    Wait Until Element Is Visible    ${WOMEN_CATEGORY_TOGGLE}    30 seconds

    Remove Advertisement Overlays
    Click Element    ${WOMEN_CATEGORY_TOGGLE}

    Wait Until Element Is Visible    ${WOMEN_TOPS_CATEGORY}    15 seconds
    Click Element    ${WOMEN_TOPS_CATEGORY}

    Wait Until Location Contains    /category_products/2    30 seconds
    Wait Until Page Contains    Women - Tops Products    30 seconds


Open Men Tshirts Category
    Go To    ${BASE_URL}
    Wait Until Location Is    ${BASE_URL}/
    Wait Until Element Is Visible    ${MEN_CATEGORY_TOGGLE}    30 seconds

    Remove Advertisement Overlays
    Click Element    ${MEN_CATEGORY_TOGGLE}

    Wait Until Element Is Visible    ${MEN_TSHIRTS_CATEGORY}    15 seconds
    Click Element    ${MEN_TSHIRTS_CATEGORY}

    Wait Until Location Contains    /category_products/3    30 seconds
    Wait Until Page Contains    Men - Tshirts Products    30 seconds


Open HM Brand
    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products
    Wait Until Element Is Visible    ${HM_BRAND}    30 seconds
    Remove Advertisement Overlays
    Click Element    ${HM_BRAND}
    Wait Until Location Contains    /brand_products/
    Wait Until Page Contains    Brand - H&M Products    30 seconds


Open Polo Brand
    Wait Until Element Is Visible    ${POLO_BRAND}    30 seconds
    Remove Advertisement Overlays
    Click Element    ${POLO_BRAND}
    Wait Until Location Contains    /brand_products/
    Wait Until Page Contains    Brand - Polo Products    30 seconds


Verify Searched Product Is In Cart After Login
    Open Cart
    Wait Until Element Is Visible    ${CART_PRODUCT}    15 seconds

    Login To Application
    Verify User Is Logged In

    Open Cart
    Wait Until Element Is Visible    ${CART_PRODUCT}    15 seconds


Add Product Review
    Open First Product Details

    Wait Until Page Contains    Write Your Review    15 seconds
    Remove Advertisement Overlays

    Input Text    ${REVIEW_NAME_FIELD}    Robot QA
    Input Text    ${REVIEW_EMAIL_FIELD}    robot.review@example.com
    Input Text    ${REVIEW_TEXT_FIELD}
    ...    Automated review submitted by the Robot Framework capstone test suite.

    Remove Advertisement Overlays
    Click Element    ${REVIEW_SUBMIT_BUTTON}


Verify Product Review Submitted
    Wait Until Element Is Visible
    ...    ${REVIEW_SUCCESS_MESSAGE}
    ...    15 seconds


Add Recommended Product To Cart
    Go To    ${BASE_URL}
    Wait Until Element Is Visible    ${RECOMMENDED_SECTION}    30 seconds

    Scroll Element Into View    ${RECOMMENDED_SECTION}
    Sleep    1s
    Remove Advertisement Overlays

    Wait Until Element Is Visible
    ...    ${RECOMMENDED_ADD_TO_CART}
    ...    15 seconds

    ${recommended_button}=    Get WebElement
    ...    ${RECOMMENDED_ADD_TO_CART}

    Execute Javascript
    ...    arguments[0].scrollIntoView({block:'center'});
    ...    ARGUMENTS
    ...    ${recommended_button}

    Remove Advertisement Overlays

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${recommended_button}

    Wait Until Page Contains
    ...    Your product has been added to cart
    ...    15 seconds

    Open Cart From Modal


Verify Recommended Product In Cart
    ${row_count}=    Get Element Count    ${CART_PRODUCT_ROWS}
    Should Be True    ${row_count} >= 1

Verify User Is Not Logged In
    Page Should Not Contain    Logged in as