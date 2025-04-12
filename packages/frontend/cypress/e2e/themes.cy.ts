describe('Theme System E2E', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage();
  });

  it('should toggle between light and dark modes', () => {
    // Check initial state
    cy.get('html').should('not.have.class', 'dark');
    
    // Click theme toggle
    cy.get('[aria-label="Switch to dark theme"]').click();
    cy.get('html').should('have.class', 'dark');
    
    // Toggle back to light
    cy.get('[aria-label="Switch to light theme"]').click();
    cy.get('html').should('not.have.class', 'dark');
  });

  it('should persist theme selection across page reloads', () => {
    // Select dark theme
    cy.get('[aria-label="Switch to dark theme"]').click();
    cy.get('html').should('have.class', 'dark');
    
    // Reload page
    cy.reload();
    cy.get('html').should('have.class', 'dark');
  });

  it('should switch between color themes', () => {
    // Open theme selector
    cy.get('[aria-label="Select color theme"]').click();
    
    // Select Forest theme
    cy.contains('button', 'Forest').click();
    
    // Verify CSS variables
    cy.get(':root').should('have.css', '--primary').and('include', 'hsl(142.1');
    
    // Select Sunset theme
    cy.get('[aria-label="Select color theme"]').click();
    cy.contains('button', 'Sunset').click();
    
    // Verify CSS variables changed
    cy.get(':root').should('have.css', '--primary').and('include', 'hsl(20.5');
  });

  it('should maintain accessibility standards', () => {
    // Check button contrast
    cy.get('[aria-label="Switch to dark theme"]')
      .should('have.css', 'background-color')
      .then((bgColor) => {
        cy.wrap(bgColor).should('not.eq', 'rgba(0, 0, 0, 0)');
      });

    // Verify ARIA labels
    cy.get('[aria-label="Switch to dark theme"]').should('be.visible');
    cy.get('[aria-label="Select color theme"]').should('be.visible');
  });

  it('should handle keyboard navigation', () => {
    // Tab to theme toggle
    cy.get('body').tab();
    cy.get('[aria-label="Switch to dark theme"]').should('be.focused');
    
    // Tab to color theme selector
    cy.get('body').tab();
    cy.get('[aria-label="Select color theme"]').should('be.focused');
    
    // Open color theme menu with Enter
    cy.focused().type('{enter}');
    cy.contains('button', 'Forest').should('be.visible');
    
    // Navigate theme options
    cy.focused().type('{downarrow}');
    cy.contains('button', 'Forest').should('be.focused');
  });

  it('should measure theme switch performance', () => {
    // Start performance measurement
    cy.window().then((win) => {
      const t0 = performance.now();
      
      // Switch theme
      cy.get('[aria-label="Switch to dark theme"]')
        .click()
        .then(() => {
          const t1 = performance.now();
          const switchTime = t1 - t0;
          
          // Theme switch should be under 100ms for smooth UX
          expect(switchTime).to.be.lessThan(100);
        });
    });
  });
}); 