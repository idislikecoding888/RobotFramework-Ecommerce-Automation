*** Variables ***

${LOGIN_LINK}        xpath=//a[contains(.,'Signup / Login')]
${EMAIL_FIELD}       css=input[data-qa="login-email"]
${PASSWORD_FIELD}    css=input[data-qa="login-password"]
${LOGIN_BUTTON}      css=button[data-qa="login-button"]
${LOGOUT_LINK}       xpath=//a[@href="/logout"]
${LOGGED_IN_TEXT}    xpath=//*[contains(text(),"Logged in as")]