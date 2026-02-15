
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    res.status(400).json({
        error: "This standalone endpoint is deprecated. Please use the main Upload page which uses the optimized /api/run-command endpoint."
    });
}
