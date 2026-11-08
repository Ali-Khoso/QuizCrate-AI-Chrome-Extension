"""Start only on local loopback; loads .env for development."""
from dotenv import load_dotenv
import uvicorn

load_dotenv()
uvicorn.run("main:app", host="127.0.0.1", port=8787, reload=False)
