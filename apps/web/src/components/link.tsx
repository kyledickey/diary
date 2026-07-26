import { Link as RouterLink } from "@tanstack/react-router";
import type { ComponentProps } from "react";

type AppLinkProps = Omit<ComponentProps<"a">, "href"> & {
    href: string;
};

export default function Link({ href, children, ...props }: AppLinkProps) {
    if (/^(https?:|mailto:)/.test(href)) {
        const rel = props.target === "_blank" ? (props.rel ?? "noopener noreferrer") : props.rel;
        return (
            <a href={href} {...props} rel={rel}>
                {children}
            </a>
        );
    }

    const to = href as ComponentProps<typeof RouterLink>["to"];
    return (
        <RouterLink to={to} {...props}>
            {children}
        </RouterLink>
    );
}
