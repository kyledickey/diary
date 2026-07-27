type PlateNode = {
    type?: string;
    text?: string;
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    children?: PlateNode[];
};

const HEADING_TYPES: Record<string, number> = {
    h1: 1,
    h2: 2,
    h3: 3,
    h4: 4,
    h5: 5,
    h6: 6,
    heading_one: 1,
    heading_two: 2,
    heading_three: 3
};

const BULLETED_LIST_TYPES = new Set(["ul", "bulleted-list", "bulleted_list"]);
const NUMBERED_LIST_TYPES = new Set(["ol", "numbered-list", "numbered_list"]);
const LIST_ITEM_TYPES = new Set(["li", "list-item", "list_item"]);
const BLOCKQUOTE_TYPES = new Set(["blockquote", "block-quote", "block_quote"]);
const PARAGRAPH_TYPES = new Set(["p", "paragraph", "lic"]);

export function normalizeDocumentContent(content: string | null): string {
    if (!content) {
        return "";
    }

    try {
        const parsed = JSON.parse(content);
        return isPlateValue(parsed) ? plateValueToMarkdown(parsed) : content;
    } catch {
        return content;
    }
}

export function plateValueToMarkdown(value: PlateNode[]): string {
    return value.map(serializeBlock).filter(Boolean).join("\n\n");
}

function isPlateValue(value: unknown): value is PlateNode[] {
    return (
        Array.isArray(value) &&
        value.every(
            (node) =>
                isRecord(node) && Array.isArray(node.children) && node.children.every(isPlateNode)
        )
    );
}

function isPlateNode(value: unknown): value is PlateNode {
    if (!isRecord(value)) {
        return false;
    }

    if (typeof value.text === "string") {
        return true;
    }

    return Array.isArray(value.children) && value.children.every(isPlateNode);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function serializeBlock(node: PlateNode): string {
    if (node.text !== undefined) {
        return serializeInline([node]);
    }

    const type = node.type ?? "p";
    const headingLevel = HEADING_TYPES[type];

    if (headingLevel) {
        return `${"#".repeat(headingLevel)} ${serializeInline(node.children ?? [])}`.trimEnd();
    }

    if (BLOCKQUOTE_TYPES.has(type)) {
        return serializeChildrenAsBlocks(node.children ?? [])
            .split("\n")
            .map((line) => `> ${line}`.trimEnd())
            .join("\n");
    }

    if (BULLETED_LIST_TYPES.has(type)) {
        return serializeList(node.children ?? [], false);
    }

    if (NUMBERED_LIST_TYPES.has(type)) {
        return serializeList(node.children ?? [], true);
    }

    if (PARAGRAPH_TYPES.has(type)) {
        return serializeInline(node.children ?? []);
    }

    return serializeChildrenAsBlocks(node.children ?? []);
}

function serializeChildrenAsBlocks(children: PlateNode[]): string {
    const containsBlocks = children.some((child) => isBlockType(child.type));

    return containsBlocks
        ? children.map(serializeBlock).filter(Boolean).join("\n\n")
        : serializeInline(children);
}

function serializeInline(nodes: PlateNode[]): string {
    return nodes
        .map((node) => {
            if (node.text === undefined) {
                return serializeInline(node.children ?? []);
            }

            let text = node.text;
            if (!text) {
                return text;
            }
            if (node.code) {
                text = `\`${text}\``;
            }
            if (node.italic) {
                text = `_${text}_`;
            }
            if (node.bold) {
                text = `**${text}**`;
            }
            return text;
        })
        .join("");
}

function serializeList(children: PlateNode[], ordered: boolean): string {
    return children
        .filter((child) => LIST_ITEM_TYPES.has(child.type ?? "li"))
        .map((item, index) => {
            const itemChildren = item.children ?? [];
            const nestedLists = itemChildren.filter((child) => isListType(child.type));
            const contentNodes = itemChildren.filter((child) => !nestedLists.includes(child));
            const content = serializeChildrenAsBlocks(contentNodes).replaceAll("\n\n", "\n");
            const marker = ordered ? `${index + 1}.` : "-";
            const nested = nestedLists
                .map(serializeBlock)
                .filter(Boolean)
                .map((list) =>
                    list
                        .split("\n")
                        .map((line) => `  ${line}`)
                        .join("\n")
                )
                .join("\n");

            return nested ? `${marker} ${content}\n${nested}` : `${marker} ${content}`;
        })
        .join("\n");
}

function isBlockType(type: string | undefined): boolean {
    return (
        PARAGRAPH_TYPES.has(type ?? "") ||
        BLOCKQUOTE_TYPES.has(type ?? "") ||
        BULLETED_LIST_TYPES.has(type ?? "") ||
        NUMBERED_LIST_TYPES.has(type ?? "") ||
        (type !== undefined && HEADING_TYPES[type] !== undefined)
    );
}

function isListType(type: string | undefined): boolean {
    return BULLETED_LIST_TYPES.has(type ?? "") || NUMBERED_LIST_TYPES.has(type ?? "");
}
