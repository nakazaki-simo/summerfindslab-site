// Renders a JSON-LD <script> for SEO. Server component (no "use client").
export default function JsonLd({ data }) {
    return (
        <script
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
    );
}
