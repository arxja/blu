describe("Multi-tenant access", () => {
  // todo: update this test after workspace UI is implemented
  it("allows a member to launch their workspace", () => {
    // Ensure cookies are shared between app and tenant hosts in tests
    // and keep secure flag false for HTTP testing.
    Cypress.env("AUTH_COOKIE_DOMAIN", "blu.test");
    Cypress.env("AUTH_COOKIE_SECURE", false);

    const appBase = Cypress.env("APP_BASE_DOMAIN") || "localhost:3000";
    const appHost = `http://app.${appBase}`;
    const tenantHost = `http://demo.${appBase}`;
    cy.intercept("POST", "**/api/auth/sign-in").as("signInRequest");
    cy.intercept("GET", "**/api/workspaces/*/launch").as("launchWorkspace");

    cy.visit(`${appHost}/sign-in`);

    cy.get('input[name="email"]').type("owner@example.com");

    cy.get('input[name="password"]').type("Test12341234");

    cy.get('button[type="submit"]').click();

    cy.wait("@signInRequest").its("response.statusCode").should("eq", 200);

    cy.url().should("eq", `${appHost}/dashboard`);

    cy.contains("Demo Workspace").should("be.visible");

    cy.contains("Launch Workspace").click();

    cy.wait("@launchWorkspace")
      .its("response.statusCode")
      .should("be.oneOf", [200, 307]);

    cy.origin(tenantHost, () => {
      cy.url().should("eq", `${tenantHost}/`);

      cy.contains("Demo Workspace").should("be.visible");

      cy.contains("Workspace Owner").should("be.visible");

      cy.contains("Role: owner").should("be.visible");
    });
  });
});
