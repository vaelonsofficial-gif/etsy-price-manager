import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "VAELONS Etsy Manager Action API",
      version: "1.0.0",
      description:
        "Lists VAELONS Etsy draft listings and schedules one or more drafts for future publication. This API does not edit listing title, SEO, tags, description, price, images, stock, shipping, or variations.",
    },
    servers: [{ url: "https://etsy-price-manager.vercel.app" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
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
            200: {
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
            "Schedules only listings that are currently VAELONS drafts. Accepts multiple products with independent publication times. Times must be ISO 8601 with timezone offset. Use Europe/Istanbul (+03:00) when the user gives Turkey local time unless they specify another timezone.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["schedules"],
                  properties: {
                    schedules: {
                      type: "array",
                      minItems: 1,
                      maxItems: 100,
                      items: {
                        type: "object",
                        additionalProperties: false,
                        required: ["listingId", "publishAt"],
                        properties: {
                          listingId: {
                            type: "string",
                            description: "Exact Etsy listing ID from listVaelonsDrafts",
                          },
                          publishAt: {
                            type: "string",
                            format: "date-time",
                            description:
                              "Publication time in ISO 8601, preferably including +03:00 for Europe/Istanbul",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Scheduled workflows created",
            },
          },
        },
      },
    },
  });
}
