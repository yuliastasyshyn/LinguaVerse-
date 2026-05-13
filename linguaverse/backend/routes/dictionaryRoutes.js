import express from "express";
import {
  getDictionaryWords,
  addDictionaryWord,
  deleteDictionaryWord,
  createDictionaryCollection,
  deleteDictionaryCollection,
} from "../controllers/dictionaryController.js";

const router = express.Router();

router.get("/", getDictionaryWords);
router.post("/", addDictionaryWord);
router.delete("/:id", deleteDictionaryWord);

router.post("/collections", createDictionaryCollection);
router.delete("/collections/:id", deleteDictionaryCollection);

export default router;
