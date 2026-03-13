import { Request, Response } from "express";

export const getCandidates = (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 1,
        name: "Sipho Dlamini",
        status: "registered",
        phone: "+27 82 123 4567",
        skills: ["Welding", "Heavy Equipment"],
      },
      {
        id: 2,
        name: "Thandi Nkosi",
        status: "pending",
        phone: "+27 73 987 6543",
        skills: ["Admin", "Data Entry"],
      },
    ],
  });
};