"""
Standard constant-velocity Kalman filter, 2D (x, y) — one instance per
tracked object. State vector: [x, y, vx, vy]. Ignores z for simplicity;
add a third dimension the same way if you need it, but 2D (BEV) is
plenty for the dashboard's ground-plane view.

Not object-specific to nuScenes/TRUST3D — this is generic and reusable.
"""
import numpy as np


class ConstantVelocityKF2D:
    def __init__(self, initial_pos: list[float], dt: float = 0.5,
                 process_noise: float = 0.5, measurement_noise: float = 1.0):
        """
        initial_pos: [x, y] starting position
        dt: time step between frames (seconds) — must match how you call predict()
        process_noise: how much we trust the constant-velocity motion model
            (higher = filter adapts faster to real direction changes, but
            smooths less)
        measurement_noise: how much we trust incoming sensor-fused positions
            (higher = filter trusts its own prediction more than new readings —
            this is what gives you smoothing)
        """
        self.dt = dt

        # state: [x, y, vx, vy]
        self.x = np.array([initial_pos[0], initial_pos[1], 0.0, 0.0])

        # state transition: constant velocity model
        self.F = np.array([
            [1, 0, dt, 0],
            [0, 1, 0, dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1],
        ])

        # we only measure position, not velocity
        self.H = np.array([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
        ])

        self.P = np.eye(4) * 10.0  # initial uncertainty, high since we just started
        self.Q = np.eye(4) * process_noise
        self.R = np.eye(2) * measurement_noise

    def predict(self) -> list[float]:
        self.x = self.F @ self.x
        self.P = self.F @ self.P @ self.F.T + self.Q
        return [float(self.x[0]), float(self.x[1])]

    def update(self, measured_pos: list[float]) -> list[float]:
        """measured_pos: [x, y] from the trust-weighted fusion step (fused_position)."""
        z = np.array(measured_pos[:2])
        y = z - self.H @ self.x  # innovation
        S = self.H @ self.P @ self.H.T + self.R
        K = self.P @ self.H.T @ np.linalg.inv(S)  # Kalman gain

        self.x = self.x + K @ y
        self.P = (np.eye(4) - K @ self.H) @ self.P
        return [float(self.x[0]), float(self.x[1])]

    def step(self, measured_pos: list[float]) -> list[float]:
        """Convenience: predict then update in one call, per frame."""
        self.predict()
        return self.update(measured_pos)


if __name__ == "__main__":
    # sanity check: object moving in a straight line with noisy measurements
    # should get smoothed toward the true line
    import random
    rng = random.Random(1)

    true_start = [0.0, 0.0]
    velocity = [2.0, 1.0]  # m/s
    dt = 0.5

    kf = ConstantVelocityKF2D(initial_pos=true_start, dt=dt)

    print(f"{'t':>4} {'true_x':>8} {'true_y':>8} {'noisy_x':>8} {'noisy_y':>8} {'smooth_x':>9} {'smooth_y':>9}")
    for t in range(10):
        true_x = true_start[0] + velocity[0] * t * dt
        true_y = true_start[1] + velocity[1] * t * dt
        noisy = [true_x + rng.uniform(-1.5, 1.5), true_y + rng.uniform(-1.5, 1.5)]
        smoothed = kf.step(noisy)
        print(f"{t:>4} {true_x:>8.2f} {true_y:>8.2f} {noisy[0]:>8.2f} {noisy[1]:>8.2f} {smoothed[0]:>9.2f} {smoothed[1]:>9.2f}")