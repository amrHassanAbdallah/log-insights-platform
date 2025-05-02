# Deal Bot Usage Analytics Exercise

> This exercise is intentionally ambitious. We do not expect every feature to be fully implemented. Focus on delivering a coherent vertical slice that proves your architectural thinking, code quality, and ability to reason about scale. Clearly document what you finished, what you skipped, and why.

## Background

The Deal Bot is a ChatGPT-style feature in the Cur8 Capital app that lets investors query deal information drawn from source documents. It speeds up discovery by serving quick, intelligent answers about investment opportunities. Your task is to build a monitoring and analytics tool that helps non-technical team members such as product and support understand how users interact with the Deal Bot. For more context, see [Cur8 Capital](https://cur8.capital).

## Objective

Create a TypeScript web app that ingests Deal Bot interaction logs in CloudWatch-style JSON from an S3 bucket, writes them to a database, and surfaces the data in a usable interface.

## Requirements

### 1. Data Ingestion

1. Read structured logs from an S3 bucket.
   1. The bucket details and AWS credentials with read-only access can be found in this [Bitwarden entry](https://send.bitwarden.com/#fglYctAQRUyIGrLQAPNkLA/msHatfjZ2ES6s64m0J9R4A). The password has been emailed to you.
2. Parse efficiently, using batching or streaming if useful.
3. Store the data in a database suited to analytics at scale.
4. Provide a single command or script that runs the ingestion end-to-end. Document that command in the README.

### 2. Backend

1. Expose an API that returns at **minimum**:
   1. Query counts per day and per week
   2. The most common questions or topics
   3. Queries that produced no results or low satisfaction
   4. Average Deal Bot response time
2. Pick REST or GraphQL and justify the choice.
3. Add pagination or caching where it makes a real difference.

### 3. Frontend

1. Let non-technical users:
   1. Search and browse conversation logs
   2. View metrics and charts that reveal usage trends
   3. Drill into common questions and errors
2. Prioritize clarity and usability over visual flair.

### 4. Architecture

1. TypeScript everywhere.
2. Two containers: one for the app and one for the database.
3. Provide a Docker Compose file.
4. Include a README that covers setup, trade-offs, and how you would extend the system given more time.

## Constraints

1. Time limit is until **11:59 PM UK time on 6 May**.
2. You can submit by emailing shuaib@islamicfinanceguru.com once you are done.
3. Use any libraries or tools, but defend every choice.
4. Do not build authentication or authorization. Assume the service runs inside a trusted boundary.
5. You may and should use AI code assistance, but you are fully responsible for architecture, code quality, and correctness.
6. Maintain complete comprehension of the codebase and be ready to adjust any part by hand.
7. Host all code in the provided private GitHub repository.
8. Ensure the whole application can be set up locally with minimal friction. If we cannot run it easily, your candidacy will be negatively affected.
9. Record at most a ten-minute Loom that walks through the application. Share the link in the README.

## Deliverables

1. Source code in this private GitHub repository.
2. Docker Compose file that starts both the application and the database.
3. A README that explains:
   1. Local setup and how to run tests
   2. The one-step command for running the ingestion pipeline
   3. Key architectural decisions and trade-offs
   4. How you would extend or harden the system with more time
4. Automated tests that cover the critical paths you consider most important.
5. The Loom video link embedded near the top of the README.

## Submission

1. Push your final code to this private GitHub repository.
2. Verify that `docker compose up` followed by visiting `http://localhost` brings the app alive.
3. Email shuaib@islamicfinanceguru.com to inform us that your submission is complete.

## What We Care About

- Scalable ingestion logic and a schema that supports fast analytics
- Query performance on realistic data volumes
- Clear and idiomatic TypeScript with strong typing
- A user experience that a non-engineer can pick up in minutes
- Insightful visualizations that go beyond vanity metrics
- Clean Docker setup and bulletproof documentation
- Thoughtful tests that inspire confidence

## What We Do Not Care About

- Pixel-perfect styling or exhaustive branding
- Production-grade security beyond the stated boundary
- Fully featured CI or CD pipelines
- Performance tuning for data far beyond the provided scale
