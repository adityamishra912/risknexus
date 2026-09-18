import os

import gradio as gr
import uvicorn
from gradio.routes import mount_gradio_app

from app.main import app as fastapi_app


def space_status() -> str:
    return "RiskNexus FastAPI backend is running. Use /docs for the API documentation."


with gr.Blocks(title="RiskNexus API") as gradio_app:
    gr.Markdown("# RiskNexus API\nThe FastAPI backend is available at `/docs` and `/api/v1`.")
    status_button = gr.Button("Check backend status")
    status_output = gr.Textbox(label="Status", value=space_status())
    status_button.click(space_status, outputs=status_output)


app = mount_gradio_app(fastapi_app, gradio_app, path="/gradio")


if __name__ == "__main__":
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=int(os.getenv("PORT", "7860")),
    )
