import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

interface GeocodingResponse {
  results: {
    latitude: number;
    longitude: number;
    name: string;
  }[];
}
interface WeatherResponse {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
}

export type WeatherToolResult = z.infer<typeof WeatherToolResultSchema>;

const WeatherToolResultSchema = z.object({
  temperature: z.number(),
  feelsLike: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windGust: z.number(),
  conditions: z.string(),
  location: z.string(),
});

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: WeatherToolResultSchema,
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});

const getWeather = async (location: string) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = (await geocodingResponse.json()) as GeocodingResponse;

  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingData.results[0];

  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

  const response = await fetch(weatherUrl);
  const data = (await response.json()) as WeatherResponse;

  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name,
  };
};

function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[code] || 'Unknown';
}

// Custom Tools for Agents 102 Challenge
export const fetchUrlTool = createTool({
  id: 'fetch-url',
  description: 'Fetch and retrieve the raw HTML/text content from any publicly accessible URL',
  inputSchema: z.object({
    url: z.string().url().describe('The URL to fetch content from'),
  }),
  outputSchema: z.string(),
  execute: async ({ context }) => {
    const response = await fetch(context.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${context.url}: ${response.status}`);
    }
    return await response.text();
  },
});

export const summarizeTool = createTool({
  id: 'summarize',
  description: 'Use AI to generate a concise summary of any text using the Nosana LLM endpoint',
  inputSchema: z.object({
    text: z.string().min(1).describe('The text to summarize'),
    max_tokens: z.number().min(64).max(2048).default(256).describe('Maximum tokens for the summary'),
  }),
  outputSchema: z.string(),
  execute: async ({ context }) => {
    const OLLAMA_API_URL = process.env.OLLAMA_API_URL || process.env.NOS_OLLAMA_API_URL || '';
    const MODEL_NAME = process.env.MODEL_NAME_AT_ENDPOINT || process.env.NOS_MODEL_NAME_AT_ENDPOINT || 'Qwen3:8b';
    
    if (!OLLAMA_API_URL) {
      throw new Error('OLLAMA_API_URL not set');
    }

    const body = {
      model: MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: 'You are a concise summarizer. Return a crisp summary.',
        },
        {
          role: 'user',
          content: `Summarize the following text:\n\n${context.text}`,
        },
      ],
      stream: false,
      max_tokens: context.max_tokens,
    };

    const res = await fetch(`${OLLAMA_API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`LLM error: ${res.status} ${err}`);
    }

    const json = await res.json();
    const content = json?.message?.content || json?.choices?.[0]?.message?.content || '';
    return String(content).trim();
  },
});