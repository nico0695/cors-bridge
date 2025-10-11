import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { Request, Response } from "express";
import { RssController } from "./RssController.js";
import { RssService } from "../../application/services/RssService.js";
import { Feed } from "../../domain/Feed.js";

describe("RssController", () => {
  let mockService: jest.Mocked<RssService>;
  let rssController: RssController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockService = {
      getFeed: jest.fn<RssService["getFeed"]>(),
    } as unknown as jest.Mocked<RssService>;

    rssController = new RssController(mockService);

    mockRequest = {
      query: {},
    };

    mockResponse = {
      status: jest.fn().mockReturnThis() as any,
      json: jest.fn().mockReturnThis() as any,
      set: jest.fn().mockReturnThis() as any,
      send: jest.fn().mockReturnThis() as any,
    };
  });

  describe("getFeed", () => {
    it("should return 400 when url parameter is missing", async () => {
      mockRequest.query = {};

      await rssController.getFeed(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Missing ?url= parameter",
      });
    });

    it("should return 400 when url parameter is not a string", async () => {
      mockRequest.query = { url: ["not", "a", "string"] };

      await rssController.getFeed(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Missing ?url= parameter",
      });
    });

    it("should return feed with CORS headers when found", async () => {
      const mockFeed: Feed = {
        data: "<rss>test</rss>",
        contentType: "application/rss+xml",
      };
      const url = "https://example.com/feed.xml";

      mockRequest.query = { url };
      mockService.getFeed.mockResolvedValue(mockFeed);

      await rssController.getFeed(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getFeed).toHaveBeenCalledWith(url);
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*"
      );
      expect(mockResponse.set).toHaveBeenCalledWith(
        "Content-Type",
        mockFeed.contentType
      );
      expect(mockResponse.send).toHaveBeenCalledWith(mockFeed.data);
    });

    it("should return 404 when feed is not found", async () => {
      const url = "https://example.com/not-found.xml";

      mockRequest.query = { url };
      mockService.getFeed.mockResolvedValue(null);

      await rssController.getFeed(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockService.getFeed).toHaveBeenCalledWith(url);
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Feed not found",
      });
    });

    it("should return 500 when service throws an error", async () => {
      const url = "https://example.com/error.xml";

      mockRequest.query = { url };
      mockService.getFeed.mockRejectedValue(new Error("Service error"));

      await rssController.getFeed(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });
});
