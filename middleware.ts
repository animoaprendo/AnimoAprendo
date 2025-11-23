import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { onboardingData } from "./app/actions";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/(.*)",
]);

const isDefaultRoute = createRouteMatcher(["/", "/search(.*)", "/browse(.*)"]);
const isTestingRoute = createRouteMatcher(["/testing(.*)"]);
const isOnboardingRoute = createRouteMatcher(["/onboarding(.*)"]);
const isOnlyTutorRoute = createRouteMatcher(["/tutor"]);
const isAdminRootRoute = createRouteMatcher(["/admin"]);
const isAdminRoute = createRouteMatcher(["/admin/(.*)"]);
const isSuperAdminRoute = createRouteMatcher(["/superadmin(.*)"]);
const isIdentityRoute = createRouteMatcher(["/.well-known(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  const { sessionClaims, userId } = await auth();
  var metadata = sessionClaims?.publicMetadata as
    | {
        onboarded: boolean;
        isAdmin?: boolean;
        adminRole?: string;
        role: string;
        accountType: string;
      }
    | undefined;

  if (isIdentityRoute(req)) {
    return NextResponse.next();
  }

  // Helper function to check if user is admin
  const isAdmin = (metadata: any) => metadata?.isAdmin === true;

  // If accessing testing routes on production, return to home
  if (isTestingRoute(req)) {
    if (process.env.NEXT_PUBLIC_DEVELOPMENT_MODE !== "true") {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  // If user is accessing onboarding when they are already onboarded, are admin, or they are not logged in
  if (isOnboardingRoute(req)) {
    if (!userId || metadata?.onboarded === true || isAdmin(metadata)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // If user is logged in and not onboarded (but skip admins)
  if (
    (isPublicRoute(req) || isDefaultRoute(req)) &&
    metadata?.onboarded === false &&
    !isAdmin(metadata) &&
    userId
  ) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Redirect admin users to appropriate dashboard when accessing default/public routes
  if (
    (isDefaultRoute(req) || req.nextUrl.pathname === "/") &&
    userId &&
    isAdmin(metadata)
  ) {
    if (metadata?.adminRole === "superAdmin") {
      return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
    }
    return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  }

  // Protect admin routes - only allow admin users (includes all admin roles)
  if (isAdminRoute(req) && userId) {
    if (!isAdmin(metadata)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect superadmin routes - only allow superadmin users
  if (isSuperAdminRoute(req) && userId) {
    if (metadata?.adminRole !== "superAdmin") {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
  }

  // Handle /admin root route redirects
  if (isAdminRootRoute(req)) {
    if (userId && isAdmin(metadata)) {
      // Admin user accessing /admin -> redirect to admin dashboard
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    } else {
      // Non-admin user accessing /admin -> redirect to landing page
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // If the user is logged in and trying to access the sign-in or sign-up page, redirect them to their dashboard/home page
  if (isPublicRoute(req) && userId) {
    if (metadata?.adminRole === "superAdmin") {
      return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
    }
    if (isAdmin(metadata)) {
      return NextResponse.redirect(new URL("/admin/dashboard", req.url));
    }
    if (metadata?.role === "tutee" && !isAdmin(metadata)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    if (metadata?.role === "tutor" && !isAdmin(metadata)) {
      return NextResponse.redirect(new URL("/tutor/dashboard", req.url));
    }
  }

  // If the user is not logged in and trying to access a protected route, redirect them to the sign-in page
  if (!isPublicRoute(req) && !userId && !isDefaultRoute(req)) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // If non-authenticated user tries to access admin or superadmin routes
  if ((isAdminRoute(req) || isSuperAdminRoute(req)) && !userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  // Alternative approach for default route redirects (currently handled above)
  // if (isDefaultRoute(req) && userId) {
  //   if (metadata?.adminRole === "superAdmin") {
  //     return NextResponse.redirect(new URL("/superadmin/dashboard", req.url));
  //   }
  //   if (metadata?.isAdmin === true) {
  //     return NextResponse.redirect(new URL("/admin/dashboard", req.url));
  //   }
  //   if (metadata?.role === "tutor" && !metadata?.isAdmin) {
  //     return NextResponse.redirect(new URL("/tutor/dashboard", req.url));
  //   }
  // }

  if (isOnlyTutorRoute(req) && userId) {
    if (metadata?.role === "tutor") {
      return NextResponse.redirect(new URL("/tutor/dashboard", req.url));
    } else {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // For all other cases, allow the request to proceed
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
