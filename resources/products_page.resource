*** Variables ***

${PRODUCTS_LINK}        xpath=//a[@href="/products"]
${SEARCH_BOX}           id=search_product
${SEARCH_BUTTON}        id=submit_search
${SEARCHED_PRODUCTS}    xpath=//h2[contains(normalize-space(.),'Searched Products')]

${ADD_TO_CART_BUTTON}   css=a[data-product-id="2"].add-to-cart

# We search for a known product and click its matching Add to cart button.
${ADD_TO_CART_BUTTON}    xpath=(//a[@data-product-id="2" and contains(@class,'add-to-cart')])[2]