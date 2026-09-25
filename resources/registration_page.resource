*** Variables ***

# Initial Signup
${SIGNUP_NAME_FIELD}          css=input[data-qa="signup-name"]
${SIGNUP_EMAIL_FIELD}         css=input[data-qa="signup-email"]
${SIGNUP_BUTTON}               css=button[data-qa="signup-button"]

# Account Information
${MR_RADIO}                   id=id_gender1
${MRS_RADIO}                  id=id_gender2
${REG_PASSWORD_FIELD}         id=password

${DAY_DROPDOWN}               id=days
${MONTH_DROPDOWN}             id=months
${YEAR_DROPDOWN}              id=years

${NEWSLETTER_CHECKBOX}        id=newsletter
${OFFERS_CHECKBOX}            id=optin

${FIRST_NAME_FIELD}           id=first_name
${LAST_NAME_FIELD}            id=last_name
${COMPANY_FIELD}              id=company
${ADDRESS1_FIELD}             id=address1
${ADDRESS2_FIELD}             id=address2
${COUNTRY_DROPDOWN}           id=country
${STATE_FIELD}                id=state
${CITY_FIELD}                 id=city
${ZIPCODE_FIELD}              id=zipcode
${MOBILE_FIELD}               id=mobile_number

${CREATE_ACCOUNT_BUTTON}      css=button[data-qa="create-account"]

# Confirmation
${ACCOUNT_CREATED_TEXT}       xpath=//b[contains(normalize-space(.),"Account Created!")]
${CONTINUE_BUTTON}            css=a[data-qa="continue-button"]

# Account cleanup
${DELETE_ACCOUNT_LINK}        xpath=//a[@href="/delete_account"]
${ACCOUNT_DELETED_TEXT}       xpath=//b[contains(normalize-space(.),"Account Deleted!")]