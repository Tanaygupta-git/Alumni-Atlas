# Alumni Atlas

## About

Alumni Atlas is a web application for visualizing and managing alumni data. Its core feature is a 3D globe that displays alumni profiles by geographic location, offering a dynamic way to discover and connect with graduates worldwide. Powered by a Python backend and a React/TypeScript frontend, the platform allows users to browse and add profiles. For administrators, the backend provides simple REST endpoints and an embedded web console for direct data inspection and moderation, ensuring seamless data management.


## Highlights

**3D Globe Visualization**  
  The centerpiece of the app is a stunning, interactive globe (built with three.js and @react-three/fiber) that plots alumni on the model using markers, making exploration fun and intuitive.

**Intuitive Alumni Management**  
  Easily search, add, and remove alumni profiles, enriched with location and career info.

**Customizable Filtering**  
  Instantly narrow down the alumni network with versatile filters for program, graduation year, country and name/company search.

**Management Workflow**  
  Join requests are reviewed through a pending queue, allowing for approval or rejection before profiles go live.

**Web Console for Admins**  
Built-in SQL query panel for fast data review, curation and diagnostics.

**Responsive Frontend**  
  Modern and speedy React interface, styled with Tailwind CSS, ensures a smooth user experience on all devices.


## Technology Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, three.js (@react-three/fiber), lucide-react (icons)

**Backend:** Python standard library HTTP server + SQLite (no external Python dependencies)


## Project Structure

```
project/
  backend/
    dbms_interface.py   # Python web server + DBMS UI (SQLite storage)
    alumni.db           # SQLite database (auto-created/managed)
    start-dbms.bat      # Helper script to start the DBMS server (Windows)
    stop-dbms.bat       # Helper script to stop the DBMS server (Windows)
  src/
    components/         # UI components (Globe, FilterPanel, etc.)
    context/            # AlumniContext (data loading + filtering)
    services/           # api.ts (REST client)
    types/              # shared TypeScript types
  package.json          # frontend dependencies/scripts
  vite.config.ts        # Vite config
```


## Subtle Touches

- Automatic geocoding for location data
- RESTful API for easy integration
- Automatic recovery and bootstrapping with sample data
- Built with a modular architecture for easy extension (authentication, advanced search, etc.)


## Usage

Just start the backend and frontend servers; everything else is handled automatically.  
Alumni Atlas is ideal for showcasing modern web/database integration and can be adapted for clubs, organizations, or anyone wanting an engaging, visual alumni directory.


## Notes

- Geocoding: Location coordinates are estimated for demo purposes.
- Database: SQLite is used for simplicity; switch to PostgreSQL/MySQL for larger deployments.
- Cross-Origin Resource Sharing (CORS): Dev setup expects frontend at 5173 and backend at 8002.