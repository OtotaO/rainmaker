/**
 * Test script for BoundaryML integration
 */

import { b } from '../baml_client';

async function testBamlIntegration() {
  console.log('🧪 Testing BoundaryML Integration...\n');

  try {
    // Test 1: Component Description Generation
    console.log('📝 Test 1: Component Description Generation');
    const description = await b.GenerateComponentDescription(
      'AuthButton',
      'typescript',
      'react',
      ['authentication', 'async'],
      ['react', '@auth0/auth0-react'],
      ['auth0.com'],
      `
import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export const AuthButton: React.FC = () => {
  const { loginWithRedirect, logout, isAuthenticated } = useAuth0();

  return (
    <button onClick={() => isAuthenticated ? logout() : loginWithRedirect()}>
      {isAuthenticated ? 'Logout' : 'Login'}
    </button>
  );
};
      `.trim()
    );
    
    console.log('✅ Generated description:', description.description);
    console.log('📋 Key features:', description.key_features);
    console.log('🎯 Use cases:', description.use_cases);
    console.log();

    // Test 2: Code Pattern Analysis
    console.log('🔍 Test 2: Code Pattern Analysis');
    const patterns = await b.AnalyzeCodePatterns(
      `
const express = require('express');
const jwt = require('jsonwebtoken');

const app = express();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'Protected route accessed', user: req.user });
});
      `.trim(),
      'javascript',
      'express'
    );

    console.log('🏗️ Design patterns:', patterns.design_patterns);
    console.log('🏛️ Architectural patterns:', patterns.architectural_patterns);
    console.log('✨ Quality indicators:', patterns.quality_indicators);
    console.log('🔗 Integration patterns:', patterns.integration_patterns);
    console.log('⚙️ Customization opportunities:', patterns.customization_opportunities);
    console.log('💡 Recommendations:', patterns.recommendations);
    console.log();

    // Test 3: Quality Assessment
    console.log('📊 Test 3: Quality Assessment');
    const quality = await b.AssessComponentQuality(
      'PaymentForm',
      `
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';

const PaymentForm = () => {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      const stripe = await loadStripe(process.env.REACT_APP_STRIPE_KEY);
      // Payment processing logic here
    } catch (error) {
      console.error('Payment failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
};

export default PaymentForm;
      `.trim(),
      true,
      false,
      ['react', '@stripe/stripe-js'],
      150
    );

    console.log('📈 Quality Scores:');
    console.log(`  Code Quality: ${quality.code_quality_score}/10`);
    console.log(`  Reliability: ${quality.reliability_score}/10`);
    console.log(`  Reusability: ${quality.reusability_score}/10`);
    console.log(`  Documentation: ${quality.documentation_score}/10`);
    console.log(`  Testing: ${quality.testing_score}/10`);
    console.log(`  Overall: ${quality.overall_score}/10`);
    console.log('💪 Strengths:', quality.strengths);
    console.log('⚠️ Weaknesses:', quality.weaknesses);
    console.log('🔧 Recommendations:', quality.recommendations);
    console.log();

    console.log('🎉 All BoundaryML tests completed successfully!');
    
  } catch (error) {
    console.error('❌ BoundaryML test failed:', error);
    
    // Check if it's an API key issue
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      console.log('\n💡 Tip: Make sure you have OPENAI_API_KEY set in your environment variables');
      console.log('   You can set it with: export OPENAI_API_KEY=your_key_here');
    }
  }
}

// Run the test
testBamlIntegration().catch(console.error);
