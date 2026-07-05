# HBCU Digital Equity Dashboard [Project Link](https://hbcu-digital-equity-research-projec.vercel.app/)

## What is it?

A geographic data visualization dashboard built for the HBCU Library Alliance. It tracks and maps key socio-economic and digital equity indicators across the communities of 103 member schools, providing a clear, statistical view of regional resources and disparities.

## Use Cases

Built for researchers, policymakers, and educational advocates to analyze, understand, and easily present digital equity gaps—such as broadband access, income levels, and educational attainment—in areas surrounding Historically Black Colleges and Universities.

## How to Log In / Access

* **Live URL:** [https://hbcu-digital-equity-research-projec.vercel.app/](https://hbcu-digital-equity-research-projec.vercel.app/)
* **Access:** Publicly accessible; no authentication or demo credentials required.

## Pages & Features

**Interactive Map Dashboard**

* Visualizes 103 HBCU locations on an interactive, highly responsive map.
* Dynamically color-codes regions based on user-selected socio-economic metrics.

**Comprehensive Equity Metrics**

* Tracks key regional data points including: Median Household Income, Educational Attainment (% Bachelor's+), High School Completion Rate (%), Broadband Access (%), Uninsured Rate (%), Poverty Rate (%), and Employment Rate (%).

**Data Filtering & Search**

* Allows users to filter schools by specific states or search directly by school name and city.
* Includes a percentile slider to easily isolate the most vulnerable or under-resourced communities.

**Summary & Comparison Views**

* Displays aggregated summary statistics (e.g., overall average income, average broadband access).
* Includes a dedicated "State Comparison" layout and an "Export Fact Sheet" feature for offline research and presentations.

## Integrations / Setup

* **Data Source:** Pulls socio-economic statistics from Census ACS (American Community Survey) Data.
* **Mapping:** Utilizes Leaflet and CARTO for rendering the interactive, data-driven geographical map layers.
* **Deployment:** Hosted via Vercel.

## Miscellaneous

* **Data State:** Uses live/real-world Census data rather than mock data.
* **Responsive Design:** Optimized to present dense geographical and statistical data cleanly on a single screen.
* **Known Limitations:** Scope is strictly limited to the 103 HBCU Library Alliance member schools. Accuracy is dependent on the latest available Census ACS datasets.

## Tech Stack

* Frontend: React / JavaScript
* Mapping & GIS: Leaflet, CARTO
* Deployment: Vercel
