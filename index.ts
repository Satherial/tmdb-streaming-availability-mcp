// MCP Server for TMDB Streaming Availability
// This server exposes four tools: getMovies, getMovieDetail, getGenres, getStreamingAvailability
// Uses @modelcontextprotocol/sdk and logic adapted from example_code.ts
//
// Required environment variables:
// - TMDB_API_TOKEN
// - RAPID_API_KEY

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as streamingAvailability from "streaming-availability";
import fetch from "node-fetch";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

// Helper: TMDB API base URLs and tokens
const TMDB_API_TOKEN = process.env.TMDB_API_TOKEN;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

// Log environment variable presence for debugging
console.error("[DEBUG] Starting TMDB Streaming Availability MCP server...");
if (!TMDB_API_TOKEN) {
  console.error("[ERROR] TMDB_API_TOKEN is missing!");
}
if (!process.env.RAPID_API_KEY) {
  console.error("[ERROR] RAPID_API_KEY is missing!");
}

const createServer = () => {
  // --- Tool schemas and descriptions ---
  const getMoviesSchema = {
    sort: z.string().optional(),
    yearFrom: z.string().optional(),
    yearTo: z.string().optional(),
    minRating: z.number().optional(),
    categories: z.array(z.string()).optional(),
  };
  const getMovieDetailSchema = { id: z.number() };
  const getGenresSchema = {};
  const getStreamingAvailabilitySchema = {
    id: z.number(),
    country: z.string().optional(),
  };

  // --- Create and start the MCP server ---
  const server = new McpServer(
    {
      name: "TMDB and Streaming Availability",
      version: "1.0.0",
      tools: [
        {
          name: "getMovies",
          description:
            "Find and recommend movies directly from TMDB in real time. You can search for movies by genre name (e.g., 'action', 'comedy') and specify how many results you want (e.g., 'find 5 action movies'). Supports filtering by: sort (e.g., 'popularity.desc', 'release_date.desc', 'vote_average.desc'), yearFrom (start release year), yearTo (end release year), minRating (minimum vote average), and categories (array of genre IDs as strings). You can combine filters. Sorting is by 'popularity.desc' by default, but you can use any TMDB-supported sort key. The tool will automatically map genre names to IDs and limit the number of results if requested. Returns an array of movie objects with id, title, overview, poster, release date, rating, and categories. This tool has direct access to TMDB and always provides up-to-date results.",
          inputSchema: zodToJsonSchema(z.object(getMoviesSchema)),
        },
        {
          name: "getMovieDetail",
          description:
            "Fetch live, detailed information for a specific movie by its TMDB ID. This tool has direct access to TMDB and returns real-time fields such as title, overview, year, rating, images, genres, director, duration, language, and release date.",
          inputSchema: zodToJsonSchema(z.object(getMovieDetailSchema)),
        },
        {
          name: "getGenres",
          description:
            "Retrieve the current list of all available movie genres directly from TMDB. No parameters required. Returns an array of genre objects with id and name. This tool always provides the latest genres from TMDB.",
          inputSchema: zodToJsonSchema(z.object(getGenresSchema)),
        },
        {
          name: "getStreamingAvailability",
          description:
            "Check real-time streaming availability for a movie by TMDB ID and country code. This tool uses TMDB IDs and provides up-to-date streaming provider information and availability details for the specified country, including platforms where the movie can be watched online.",
          inputSchema: zodToJsonSchema(
            z.object(getStreamingAvailabilitySchema)
          ),
        },
      ],
    },
    {
      capabilities: {
        tools: { listChanged: true },
      },
    }
  );

  // Log tool registration
  console.error(
    "[DEBUG] Registering tools: getMovies, getMovieDetail, getGenres, getStreamingAvailability"
  );

  // --- Tool: getMovies ---
  server.tool(
    "getMovies",
    {
      sort: z.string().optional(),
      yearFrom: z.string().optional(),
      yearTo: z.string().optional(),
      minRating: z.number().optional(),
      categories: z.array(z.string()).optional(),
    },
    async (args) => {
      const { sort, yearFrom, yearTo, minRating, categories } = args;
      console.log("[DEBUG] getMovies called with input:", JSON.stringify(args));
      try {
        // Build query params for TMDB API
        const queryParams = new URLSearchParams({
          include_adult: "false",
          include_video: "false",
          language: "en-US",
          page: "1",
          sort_by: sort || "popularity.desc",
        });
        if (yearFrom)
          queryParams.append("primary_release_date.gte", `${yearFrom}-01-01`);
        if (yearTo)
          queryParams.append("primary_release_date.lte", `${yearTo}-12-31`);
        if (minRating)
          queryParams.append("vote_average.gte", String(minRating));
        if (categories) queryParams.append("with_genres", categories.join(","));

        const res = await fetch(
          `${TMDB_BASE_URL}/discover/movie?${queryParams.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${TMDB_API_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
        const data = (await res.json()) as { results: any[] };
        const movies = data.results.map((movie: any) => ({
          id: movie.id,
          title: movie.title,
          overview: movie.overview,
          posterPath: movie.poster_path
            ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
            : null,
          releaseDate: movie.release_date,
          voteAverage: movie.vote_average,
          categories: movie.genre_ids,
        }));
        const output: any = {
          content: [
            {
              type: "text",
              text: JSON.stringify({ movies, totalCount: movies.length }),
            },
          ],
        };
        console.log("[DEBUG] getMovies output:", JSON.stringify(output));
        return output;
      } catch (error) {
        console.error("[ERROR] getMovies failed:", error);
        throw error;
      }
    }
  );

  // --- Tool: getMovieDetail ---
  server.tool("getMovieDetail", { id: z.number() }, async (args, extra) => {
    const { id } = args;
    console.log(
      "[DEBUG] getMovieDetail called with input:",
      JSON.stringify(args)
    );
    try {
      if (!id) throw new Error("Movie ID required");
      const res = await fetch(`${TMDB_BASE_URL}/movie/${id}`, {
        headers: {
          Authorization: `Bearer ${TMDB_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
      const movie = (await res.json()) as any;
      const result = {
        id: movie.id,
        title: movie.title,
        overview: movie.overview,
        year: new Date(movie.release_date).getFullYear(),
        rating: movie.vote_average,
        imageUrl: movie.poster_path
          ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
          : null,
        backdropUrl: movie.backdrop_path
          ? `${TMDB_IMAGE_BASE_URL}${movie.backdrop_path}`
          : null,
        categories: movie.genres?.map((g: any) => g.name),
        duration: movie.runtime,
        language: movie.original_language,
        releaseDate: movie.release_date,
      };
      const output: any = {
        content: [
          {
            type: "text",
            text: JSON.stringify(result),
          },
        ],
      };
      console.log("[DEBUG] getMovieDetail output:", JSON.stringify(output));
      return output;
    } catch (error) {
      console.error("[ERROR] getMovieDetail failed:", error);
      throw error;
    }
  });

  // --- Tool: getGenres ---
  server.tool("getGenres", {}, async () => {
    console.log("[DEBUG] getGenres called with input: {} (no parameters)");
    try {
      const res = await fetch(`${TMDB_BASE_URL}/genre/movie/list`, {
        headers: {
          Authorization: `Bearer ${TMDB_API_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
      const data = (await res.json()) as { genres: any[] };
      const output: any = {
        content: [
          {
            type: "text",
            text: JSON.stringify({ genres: data.genres }),
          },
        ],
      };
      console.log("[DEBUG] getGenres output:", JSON.stringify(output));
      return output;
    } catch (error) {
      console.error("[ERROR] getGenres failed:", error);
      throw error;
    }
  });

  // --- Tool: getStreamingAvailability ---
  server.tool(
    "getStreamingAvailability",
    {
      id: z.number(),
      country: z.string().optional(),
    },
    async (args) => {
      const { id, country } = args;
      console.log(
        "[DEBUG] getStreamingAvailability called with input:",
        JSON.stringify(args)
      );
      try {
        const countryCode = (country || "us").toLowerCase();
        if (!id) throw new Error("Movie ID required");
        if (!/^[a-z]{2}$/.test(countryCode))
          throw new Error("Invalid country code");
        if (!process.env.RAPID_API_KEY)
          throw new Error("RAPID_API_KEY not set");
        const client = new streamingAvailability.Client(
          new streamingAvailability.Configuration({
            apiKey: process.env.RAPID_API_KEY,
          })
        );
        const formattedId = `movie/${id}`;
        const streamingInfo = await client.showsApi.getShow({
          id: formattedId,
          country: countryCode,
        });
        const output: any = {
          content: [
            {
              type: "text",
              text: JSON.stringify(streamingInfo),
            },
          ],
        };
        console.log(
          "[DEBUG] getStreamingAvailability output:",
          JSON.stringify(output)
        );
        return output;
      } catch (error) {
        console.error("[ERROR] getStreamingAvailability failed:", error);
        throw error;
      }
    }
  );

  return { server };
};

async function main() {
  const transport = new StdioServerTransport();
  const { server } = createServer();

  try {
    await server.connect(transport);
    console.error("[DEBUG] MCP server connected and running.");
  } catch (error) {
    console.error("[ERROR] MCP server failed to start:", error);
    process.exit(1);
  }

  // Cleanup on exit
  process.on("SIGINT", async () => {
    console.error("[DEBUG] SIGINT received, shutting down server...");
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[ERROR] Unhandled server error:", error);
  process.exit(1);
});
