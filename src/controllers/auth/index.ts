// MODULE: Authentication & Identity Controller Manifest
// This file acts as a central distribution hub for all authentication-related logic.
// By centralizing exports here, we maintain clean import paths throughout the router files.

/**
 * HEADER: Lifecycle & Session Management
 * API: Core endpoints for user onboarding and session termination.
 */
export { register } from "./register.controller"; 
export { login } from "./login.controller";       
export { logout } from "./logout.controller";      

/**
 * HEADER: Profile & Identity Forensics
 * API: Endpoints for retrieving the current authenticated state.
 */
export { getMe } from "./getMe.controller";       