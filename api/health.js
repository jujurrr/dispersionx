export const config = { runtime: 'edge' };

export default async () => {
  return Response.json({
    status: 'ok',
    market_open: new Date().getDay() >= 1 && new Date().getDay() <= 5,
    timestamp: new Date().toISOString(),
  });
};
