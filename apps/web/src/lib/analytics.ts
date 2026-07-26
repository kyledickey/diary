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
    | "home_page_get_started_click"
    | "home_page_portfolio_link_click"
    | "home_page_pricing_click"
    | "home_page_sign_in_click"
    | "sign_out";

type AnalyticsProperties = Record<string, string | number>;

declare global {
    interface Window {
        visitors?: {
            track: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void;
        };
    }
}

export function trackAnalytics(event: AnalyticsEvent, properties?: AnalyticsProperties) {
    window.visitors?.track(event, properties);
}

export function useAnalytics() {
    return useCallback(
        (event: AnalyticsEvent, properties?: AnalyticsProperties) =>
            trackAnalytics(event, properties),
        []
    );
}
