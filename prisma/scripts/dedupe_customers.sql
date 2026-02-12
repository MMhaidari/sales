WITH ranked AS (
  SELECT
    id,
    name,
    "createdAt",
    ROW_NUMBER() OVER (
      PARTITION BY name
      ORDER BY "createdAt" DESC, id DESC
    ) AS rn
  FROM "Customer"
)
DELETE FROM "Customer"
WHERE id IN (
  SELECT id FROM ranked WHERE rn > 1
);
