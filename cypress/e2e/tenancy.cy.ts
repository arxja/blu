describe("Multi-tenant access", () => {
  // todo: update this test after workspace UI is implemented
  it("allows a member to launch their workspace", () => {
    cy.intercept("POST", "**/api/auth/sign-in").as("signInRequest");
    cy.intercept("GET", "**/api/workspaces/*/launch").as("launchWorkspace");

    cy.visit("http://app.blu.test:3000/sign-in");

    cy.get('input[name="email"]').type("owner@example.com");

    cy.get('input[name="password"]').type("Test12341234");

    cy.get('button[type="submit"]').click();

    cy.wait("@signInRequest").its("response.statusCode").should("eq", 200);

    cy.url().should("eq", "http://app.blu.test:3000/dashboard");

    cy.contains("Demo Workspace").should("be.visible");

    cy.contains("Launch Workspace").click();

    cy.wait("@launchWorkspace")
      .its("response.statusCode")
      .should("be.oneOf", [200, 307]);

    cy.origin("http://demo.blu.test:3000", () => {
      cy.url().should("eq", "http://demo.blu.test:3000/");

      cy.contains("Demo Workspace").should("be.visible");

      cy.contains("Workspace Owner").should("be.visible");

      cy.contains("Role: owner").should("be.visible");
    });
  });
});
