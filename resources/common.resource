*** Settings ***
Library    SeleniumLibrary
Library    DateTime


*** Keywords ***

Generate Unique Registration Data
    ${timestamp}=    Get Current Date    result_format=%Y%m%d%H%M%S
    ${unique_email}=    Catenate    SEPARATOR=    robotuser    ${timestamp}    @example.com
    Set Test Variable    ${REG_NAME}       Robot Test User
    Set Test Variable    ${REG_EMAIL}      ${unique_email}
    Set Test Variable    ${REG_PASSWORD}   Test@12345


Register New User
    Remove Advertisement Overlays
    Click Element    ${LOGIN_LINK}

    Wait Until Element Is Visible    ${SIGNUP_NAME_FIELD}
    Input Text    ${SIGNUP_NAME_FIELD}     ${REG_NAME}
    Input Text    ${SIGNUP_EMAIL_FIELD}    ${REG_EMAIL}
    Click Element    ${SIGNUP_BUTTON}

    Wait Until Element Is Visible    ${MR_RADIO}

    Click Element    ${MR_RADIO}
    Input Text    ${REG_PASSWORD_FIELD}    ${REG_PASSWORD}

    Select From List By Value    ${DAY_DROPDOWN}      10
    Select From List By Value    ${MONTH_DROPDOWN}    5
    Select From List By Value    ${YEAR_DROPDOWN}     2000

    Select Registration Checkbox    ${NEWSLETTER_CHECKBOX}
    Select Registration Checkbox    ${OFFERS_CHECKBOX}

    Input Text    ${FIRST_NAME_FIELD}    Robot
    Input Text    ${LAST_NAME_FIELD}     Automation
    Input Text    ${COMPANY_FIELD}      Capstone Project
    Input Text    ${ADDRESS1_FIELD}      Kolkata
    Input Text    ${ADDRESS2_FIELD}      Salt Lake

    Select From List By Label    ${COUNTRY_DROPDOWN}    India

    Input Text    ${STATE_FIELD}       West Bengal
    Input Text    ${CITY_FIELD}        Kolkata
    Input Text    ${ZIPCODE_FIELD}     700091
    Input Text    ${MOBILE_FIELD}      9876543210

    Remove Advertisement Overlays
        Wait Until Element Is Visible    ${CREATE_ACCOUNT_BUTTON}    30 seconds
        Scroll Element Into View         ${CREATE_ACCOUNT_BUTTON}

        ${create_button}=    Get WebElement    ${CREATE_ACCOUNT_BUTTON}

        Execute Javascript
        ...    arguments[0].click();
        ...    ARGUMENTS
        ...    ${create_button}


Verify Account Created
    Remove Advertisement Overlays
    Wait Until Element Is Visible    ${ACCOUNT_CREATED_TEXT}
    Element Should Be Visible        ${ACCOUNT_CREATED_TEXT}


Continue After Registration
    Click Element    ${CONTINUE_BUTTON}


Open Application
    Open Browser    ${BASE_URL}    ${BROWSER}
    Maximize Browser Window
    Set Selenium Timeout    15 seconds


Close Application
    Close All Browsers


Login To Application
    Click Element    ${LOGIN_LINK}
    Wait Until Element Is Visible    ${EMAIL_FIELD}    30 seconds

    Remove Advertisement Overlays

    Input Text    ${EMAIL_FIELD}       ${VALID_EMAIL}
    Input Text    ${PASSWORD_FIELD}    ${VALID_PASSWORD}

    Scroll Element Into View    ${LOGIN_BUTTON}
    Remove Advertisement Overlays

    ${login_button}=    Get WebElement    ${LOGIN_BUTTON}

    Execute Javascript
    ...    arguments[0].click();
    ...    ARGUMENTS
    ...    ${login_button}


Verify User Is Logged In
    Remove Advertisement Overlays
    Wait Until Element Is Visible    ${LOGGED_IN_TEXT}
    Page Should Contain         Logged in as

Search For Product
    Remove Advertisement Overlays

    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products
    Wait Until Element Is Visible    ${SEARCH_BOX}    45 seconds

    Remove Advertisement Overlays

    Input Text    ${SEARCH_BOX}    ${SEARCH_PRODUCT}
    Click Element    ${SEARCH_BUTTON}

    Wait Until Element Is Visible    ${SEARCHED_PRODUCTS}    30 seconds


Add Product To Cart
    Remove Advertisement Overlays

    Wait Until Element Is Visible    ${ADD_TO_CART_BUTTON}    30 seconds
    Scroll Element Into View          ${ADD_TO_CART_BUTTON}

    Execute Javascript
    ...    const buttons = [...document.querySelectorAll('a[data-product-id="2"].add-to-cart')];
    ...    const visible = buttons.find(el => {
    ...        const r = el.getBoundingClientRect();
    ...        return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight;
    ...    });
    ...    if (!visible) throw new Error("Visible Men Tshirt Add to Cart button not found");
    ...    visible.click();

    Wait Until Element Is Visible
    ...    xpath=//*[contains(normalize-space(.),'Your product has been added to cart')]
    ...    15 seconds


Open Cart
    Remove Advertisement Overlays
    Go To    ${BASE_URL}/view_cart
    Wait Until Location Contains    /view_cart
    Wait Until Element Is Visible    ${CART_PRODUCT}    30 seconds


Verify Product In Cart
    Remove Advertisement Overlays
    Element Should Be Visible    ${CART_PRODUCT}


Logout From Application
    Remove Advertisement Overlays
    Click Element    ${LOGOUT_LINK}

Remove Advertisement Overlays
    Execute Javascript
    ...    document.querySelectorAll('iframe[id^="aswift"], div[id^="aswift"], ins.adsbygoogle, [id^="google_ads_iframe"], [id*="google_ads_iframe"]').forEach(el => el.remove());
    Execute Javascript
    ...    document.querySelectorAll('body > *').forEach(el => { const s = getComputedStyle(el); if (s.position === 'fixed' && parseInt(s.zIndex || '0') > 100000) el.remove(); });
Select Registration Checkbox
    Remove Advertisement Overlays
    [Arguments]    ${locator}

    ${element}=    Get WebElement    ${locator}

    Execute Javascript
    ...    if (!arguments[0].checked) { arguments[0].click(); }
    ...    ARGUMENTS
    ...    ${element}

    Checkbox Should Be Selected    ${locator}

Search Product With Data
    [Arguments]    ${product_name}

    Remove Advertisement Overlays

    Go To    ${BASE_URL}/products
    Wait Until Location Contains    /products
    Wait Until Element Is Visible    ${SEARCH_BOX}    30 seconds

    Remove Advertisement Overlays

    Input Text    ${SEARCH_BOX}    ${product_name}
    Click Element    ${SEARCH_BUTTON}

    Wait Until Element Is Visible    ${SEARCHED_PRODUCTS}    30 seconds

    Wait Until Page Contains    ${product_name}    30 seconds
    Page Should Contain         ${product_name}