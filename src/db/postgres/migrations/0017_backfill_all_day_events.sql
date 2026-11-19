UPDATE "Event"
SET "all_day" = true
WHERE "all_day" = false
  AND EXTRACT(HOUR FROM "start_date") = 0
  AND EXTRACT(MINUTE FROM "start_date") = 0
  AND EXTRACT(SECOND FROM "start_date") = 0
  AND EXTRACT(HOUR FROM "end_date") = 23
  AND EXTRACT(MINUTE FROM "end_date") = 59
  AND "end_date" >= "start_date";
--> statement-breakpoint
UPDATE "Event"
SET
  "all_day" = true,
  "start_date" = (("start_date" - interval '3 hours')::date)::timestamp,
  "end_date" = (("end_date" - interval '3 hours')::date)::timestamp + interval '23 hours 59 minutes 59 seconds'
WHERE "all_day" = false
  AND EXTRACT(HOUR FROM "start_date") = 3
  AND EXTRACT(MINUTE FROM "start_date") = 0
  AND EXTRACT(SECOND FROM "start_date") = 0
  AND EXTRACT(HOUR FROM "end_date") = 2
  AND EXTRACT(MINUTE FROM "end_date") = 59
  AND "end_date" >= "start_date";
