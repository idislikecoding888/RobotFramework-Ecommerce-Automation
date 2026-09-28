# Selenator — Robot Framework E-Commerce Automation

## Overview

Selenator is a QA-focused web console built around a Robot Framework automation suite for the **Automation Exercise** e-commerce application.

The project demonstrates:

- Robot Framework
- SeleniumLibrary
- Keyword-driven testing
- Data-driven testing
- Resource files
- User-defined keywords
- Test setup and teardown
- Page Object Model concepts
- Command-line execution
- Robot Framework reporting
- Jenkins pipeline configuration

## Project Structure

```text
RobotFramework-Ecommerce-Automation/
├── tests/
│   └── ecommerce_tests.robot
├── resources/
│   ├── common.resource
│   ├── login_page.resource
│   ├── registration_page.resource
│   ├── products_page.resource
│   ├── cart_page.resource
│   ├── advanced_ecommerce.resource
│   └── test_data.resource
├── results/
├── screenshots/
├── README.md
├── requirements.txt
└── Jenkinsfile
```

## Application Under Test

Automation Exercise:

https://automationexercise.com/

## Main Business Flow

Launch Browser → Login → Search Product → Add Product To Cart → Verify Cart → Logout → Close Browser

## Additional Coverage

The suite also includes registration, invalid login, logout validation, product details, subscription, multiple products, quantity validation, removal from cart, invalid search, total-price calculation, cart persistence, reviews, and recommended-product behavior.

## Running the Suite

Install dependencies:

```powershell
pip install -r requirements.txt
```

Run the complete suite:

```powershell
python -m robot --outputdir results tests
```

Run a single test:

```powershell
python -m robot --outputdir results -t "TC03 - Verify Product Can Be Added To Cart" tests
```

Robot Framework will generate execution artifacts under `results/`.

## Reporting

Typical generated artifacts include:

- `results/report.html`
- `results/log.html`
- `results/output.xml`

Open `report.html` in a browser to inspect the execution summary.

## Selenator

The Selenator UI is the presentation layer for the automation workflow. It is designed to surface test execution, failures, screenshots and QA-oriented information in one interface.

## Jenkins

A `Jenkinsfile` is included for CI execution. The pipeline is configured to install Python dependencies, run the Robot Framework suite and archive the generated `results/` artifacts.

The suite is also directly executable from the command line, so Jenkins is not required for local execution.

## Notes

- Keep account credentials and other secrets outside the repository whenever possible.
- Do not commit real passwords or private credentials to GitHub.
- Keep generated reports/screenshots that are required for academic evidence inside the capstone submission folder.
