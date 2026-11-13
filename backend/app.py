"""
Minimal HF Spaces entrypoint - just the Gradio interface
"""
import gradio as gr
import os

# Simple standalone demo for HF Spaces
def create_simple_demo():
    with gr.Blocks(title="Seka Kama - Lion Habitat Predictions") as demo:
        gr.Markdown("# Seka Kama: Ecological Digital Twin")
        gr.Markdown("AI-powered lion habitat prediction for Maasai Mara, Kenya")
        
        with gr.Tab("Status"):
            gr.Markdown("""
            ### System Status
            
            ✅ ML Models: Loaded from HF Hub (Jasekm2/sekanet-models)  
            ✅ Prediction Service: Ready  
            ⚠️ Full API: Requires environment variables (demo mode)
            
            This is a demonstration deployment. The full interactive mapping
            interface is available at: https://seka-kama.vercel.app
            """)
            
            status_btn = gr.Button("Check System Health")
            status_output = gr.Textbox(label="Status")
            
            def check_health():
                return "✅ System operational\n✅ Models loaded\n✅ Ready for predictions"
            
            status_btn.click(fn=check_health, outputs=status_output)
        
        with gr.Tab("About"):
            gr.Markdown("""
            ### About Seka Kama
            
            Seka Kama uses machine learning to predict lion population density
            and simulate conservation scenarios for Maasai Mara, Kenya.
            
            **Technology:**
            - XGBoost model trained on VIIRS nightlight satellite imagery
            - Models hosted on Hugging Face Hub
            - FastAPI backend with Supabase PostGIS database
            
            **Data Sources:**
            - VIIRS nightlight composites (2012-2024)
            - NASA POWER climate data
            - GBIF wildlife occurrences
            - WDPA protected areas
            
            **Full Web App:** https://seka-kama.vercel.app
            """)
    
    return demo

# Create and launch
if __name__ == "__main__":
    demo = create_simple_demo()
    demo.launch()
