# Rainmaker Security Checklist

This checklist covers essential security measures for the Rainmaker application, with particular focus on Supabase implementation.

## Database Security

- [ ] **Enable Row-Level Security (RLS)**
  - Turn on RLS in Supabase from day one
  - Create policies for each table that ensure users can only access their own data
  - Example policy:
    ```sql
    CREATE POLICY "Users can only access their own data"
    ON public.your_table_name
    FOR ALL
    USING (auth.uid() = user_id);
    ```

- [ ] **Database Access Control**
  - Use Supabase service role key only in secure backend environments
  - Never expose the service role key in frontend code
  - Use the anon key for public client access with appropriate RLS policies

## API Security

- [ ] **Rate Limit API Endpoints**
  - Implement rate limiting in Supabase Edge Functions
  - Consider using Vercel Middleware for additional rate limiting
  - Monitor for unusual traffic patterns

- [ ] **API Authentication**
  - Validate JWT tokens on all protected routes
  - Implement proper session management
  - Set reasonable token expiration times

## Frontend Security

- [ ] **Add CAPTCHA to Authentication Forms**
  - Integrate Google reCAPTCHA or hCaptcha on:
    - Signup forms
    - Login forms
    - Password reset forms
  - Configure with appropriate security levels

- [ ] **Secure Form Handling**
  - Implement client-side validation for UX
  - Always validate all inputs on the server side
  - Use Zod or similar for schema validation

## Infrastructure Security

- [ ] **Turn on Web Application Firewall (WAF) Protection**
  - For Vercel deployments, enable WAF (Attack Challenge) on all routes
  - Configure appropriate security rules

- [ ] **Keep API Keys Secret**
  - Store all keys in `.env` files (never in version control)
  - Required keys:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `DATABASE_URL`
    - `ANTHROPIC_API_KEY`
    - `GITHUB_TOKEN`

## Dependency Management

- [ ] **Clean Your Dependencies**
  - Run `bun audit` regularly
  - Update packages promptly when security patches are available
  - Remove unused dependencies

## Monitoring and Logging

- [ ] **Monitor and Log Activity**
  - Implement logging using Supabase logs
  - Consider additional logging with Vercel Analytics, LogSnag, or LogRocket
  - Pay attention to:
    - Failed login attempts
    - Unusual traffic patterns
    - Database access patterns
    - API usage patterns

## Regular Security Reviews

- [ ] **Scheduled Security Audits**
  - Review RLS policies regularly
  - Check for exposed credentials
  - Review access logs for suspicious activity
  - Test authentication and authorization mechanisms

## Deployment Checklist

- [ ] Confirm all environment variables are properly set
- [ ] Verify RLS policies are enabled and functioning
- [ ] Test API endpoints for proper authentication
- [ ] Ensure rate limiting is properly configured
- [ ] Verify WAF is enabled on production deployments 