describe("Multi-tenant access", () => {
  it("allows a member to launch their workspace and see the Overview page", () => {
    // Ensure cookies are shared between app and tenant hosts in tests
    // and keep secure flag false for HTTP testing.
    Cypress.env("AUTH_COOKIE_DOMAIN", "blu.test");
    Cypress.env("AUTH_COOKIE_SECURE", false);

    const appBase = Cypress.env("APP_BASE_DOMAIN") || "localhost:3000";
    const appHost = `http://app.${appBase}`;
    const tenantHost = `http://demo.${appBase}`;

    cy.intercept("POST", "**/api/auth/sign-in").as("signInRequest");
    cy.intercept("GET", "**/api/workspaces/*/launch").as("launchWorkspace");

    // ── Sign in on the app host ──
    cy.visit(`${appHost}/sign-in`);
    cy.get('input[name="email"]').type("owner@example.com");
    cy.get('input[name="password"]').type("Test12341234");
    cy.get('button[type="submit"]').click();

    cy.wait("@signInRequest").its("response.statusCode").should("eq", 200);
    cy.url().should("eq", `${appHost}/dashboard`);

    // ── Launch the demo workspace ──
    cy.contains("Demo Workspace").should("be.visible");
    cy.contains("Launch Workspace").click();

    cy.wait("@launchWorkspace")
      .its("response.statusCode")
      .should("be.oneOf", [200, 307]);

    // ── Land on the tenant host ──
    cy.origin(tenantHost, { args: { tenantHost } }, ({ tenantHost }) => {
      cy.url().should("eq", `${tenantHost}/`);

      // Sidebar: workspace identity + primary navigation.
      cy.get("aside").within(() => {
        cy.contains("Demo Workspace").should("be.visible");
        cy.contains("a", "Overview").should("be.visible");
      });

      // TopBar: page title resolved from the nav config.
      cy.get("header").contains("Overview").should("be.visible");

      // Overview page content.
      cy.contains("Last 30 days").should("be.visible");
      cy.contains("Total events").should("be.visible");
      cy.contains("Unique users").should("be.visible");
      cy.contains("Top event").should("be.visible");
      cy.contains("Events today").should("be.visible");
      cy.contains("Recent events").should("be.visible");
    });
  });
});
