class RedisScheduler:
    def __init__(self, monitor):
        self.monitor = monitor

    async def start(self):
        print("RedisScheduler started (Dummy)")

    def get_scheduler_status(self):
        return {"status": "running (dummy)"}

    async def run_manual_cleanup(self):
        return {"message": "manual cleanup (dummy)"}

    async def run_manual_backup(self, name):
        return {"message": "manual backup (dummy)"}

