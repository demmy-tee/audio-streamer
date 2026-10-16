import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("audio-worker")

def main():
    logger.info("Audio Commitment AI Worker initialized and waiting for tasks...")
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logger.info("Audio Commitment AI Worker shutting down gracefully.")

if __name__ == "__main__":
    main()
