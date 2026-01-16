import { auth as middleware } from '@/auth';

const signInPathName = '/login';

// REMOVED THE COMMENTS HERE

export default middleware((req) => {
    const { nextUrl } = req;
    
    // logic to check if user is authenticated
    const isAuthenticated = !!req.auth;

    // Prevent login redirect loop
    if (nextUrl.pathname === signInPathName) return; // 'return null' is also fine, but empty return is cleaner
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return Response.redirect(new URL(signInPathName, nextUrl));
    }
});

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};