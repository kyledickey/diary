import { useCallback } from "react";

export type AnalyticsEvent =
    | "document_blur"
    | "document_created"
    | "document_deleted"
    | "document_font_family_change"
    | "document_font_size_change"
    | "feedback_submitted"
    | "footer_github_link_click"
    | "footer_portfolio_link_click"
    | "footer_privacy_click"
    | "footer_terms_click"
    | "footer_twitter_link_click"
    | "home_page_authed_redirect"
    | "home_page_portfolio_link_click"
    | "sign_out";

declare global {
    interface Window {
        plausible?: (
            event: AnalyticsEvent,
            options?: { props?: Record<string, string | number | boolean> }
        ) => void;
    }
}

export function trackAnalytics(event: AnalyticsEvent) {
    window.plausible?.(event);
}

export function useAnalytics() {
    return useCallback((event: AnalyticsEvent) => trackAnalytics(event), []);
}
