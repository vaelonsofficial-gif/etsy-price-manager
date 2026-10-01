import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "VAELONS Etsy Manager Action API",
      version: "1.1.0",
      description:
        "Lists VAELONS Etsy drafts, schedules publication, reads listing variation prices, and updates only explicitly selected product variation prices after confirmation. It does not edit title, SEO, tags, description, images, stock, shipping, or variation definitions.",
    },
    servers: [{ url: "https://etsy-price-manager.vercel.app" }],
    components: {
      schemas: {
        ScheduleItem: {
          type: "object",
          additionalProperties: false,
          required: ["listingId", "publishAt"],
          properties: {
            listingId: {
              type: "string",
              description: "Exact Etsy listing ID returned by listVaelonsDrafts",
            },
            publishAt: {
              type: "string",
              format: "date-time",
              description:
                "Publication time in ISO 8601. Use +03:00 for Europe/Istanbul when the user gives Turkey local time unless another timezone is specified.",
            },
          },
        },
        ScheduleRequest: {
          type: "object",
          additionalProperties: false,
          required: ["schedules"],
          properties: {
            schedules: {
              type: "array",
              minItems: 1,
              maxItems: 100,
              items: { $ref: "#/components/schemas/ScheduleItem" },
            },
          },
        },
      },
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    paths: {
      "/api/gpt/prices": {
        get: { operationId: "getVaelonsListingPrices", summary: "Read all current variation prices for one VAELONS listing", parameters: [{ name: "listingId", in: "query", required: true, schema: { type: "string" } }], responses: { "200": { description: "Listing inventory and prices" } } },
        post: { operationId: "updateVaelonsSelectedPrices", summary: "Update only explicitly selected VAELONS variation prices", description: "Call GET first. Never infer productId. POST only after the user has specified the intended item/variation and price.", requestBody: { required: true, content: { "application/json": { schema: { type: "object", additionalProperties: false, required: ["listingId","updates","confirm"], properties: { listingId: { type: "string" }, confirm: { type: "boolean", const: true }, updates: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, required: ["productId","price"], properties: { productId: { type: "string" }, price: { type: "number", exclusiveMinimum: 0 } } } } } } } }, responses: { "200": { description: "Only selected prices updated" } } }
      },
      "/api/gpt/drafts": {
        get: {
          operationId: "listVaelonsDrafts",
          summary: "List current VAELONS Etsy drafts",
          description:
            "Use this before scheduling when the user refers to products by title or asks what drafts are available.",
          responses: {
            "200": {
              description: "Current draft listings",
            },
          },
        },
      },
      "/api/gpt/schedule": {
        post: {
          operationId: "scheduleVaelonsDrafts",
          summary: "Schedule one or more VAELONS Etsy drafts",
          description:
            "Schedules only listings that are currently VAELONS drafts. Accepts multiple products with independent publication times.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ScheduleRequest" },
              },
            },
          },
          responses: {
            "200": {
              description: "Scheduled workflows created",
            },
          },
        },
      },
    },
  });
}
