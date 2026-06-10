import express from "express";
import {
  getDictionaryWords,
  addDictionaryWord,
  deleteDictionaryWord,
  createDictionaryCollection,
  deleteDictionaryCollection,
} from "../controllers/dictionaryController.js";

const router = express.Router();


router.post("/collections", createDictionaryCollection);
router.delete("/collections/:id", deleteDictionaryCollection);


router.get("/", getDictionaryWords);
router.post("/", addDictionaryWord);
router.delete("/:id", deleteDictionaryWord);

export default router;
