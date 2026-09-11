import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "VAELONS Etsy Manager Action API",
      version: "1.0.2",
      description:
        "Lists VAELONS Etsy draft listings and schedules one or more drafts for future publication. This API does not edit listing title, SEO, tags, description, price, images, stock, shipping, or variations.",
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
