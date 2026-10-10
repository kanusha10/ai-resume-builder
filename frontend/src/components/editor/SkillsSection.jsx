import React, { useState } from "react";
import { Plus, X, Trash2, Cpu } from "lucide-react";
import "./SectionStyles.css";

// Do not create default categories.
// Use only categories provided in the resume data.
function normalizeSkills(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  const result = {};

  Object.entries(data).forEach(([categoryName, rawSkills]) => {
    if (typeof categoryName !== "string" || !categoryName.trim()) {
      return;
    }

    let skills = [];

    if (Array.isArray(rawSkills)) {
      skills = rawSkills;
    } else if (typeof rawSkills === "string") {
      skills = rawSkills.split(/[,;\n]/);
    } else {
      return;
    }

    result[categoryName] = skills
      .filter(
        (skill) =>
          typeof skill === "string" || typeof skill === "number"
      )
      .map((skill) => String(skill).trim())
      .filter(Boolean)
      .filter(
        (skill, index, allSkills) =>
          allSkills.findIndex(
            (existing) =>
              existing.toLowerCase() === skill.toLowerCase()
          ) === index
      );
  });

  return result;
}

export default function SkillsSection({ data = {}, onChange }) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [activeInput, setActiveInput] = useState({});

  const skillCategories = normalizeSkills(data);

  const handleAddCategory = (e) => {
    e.preventDefault();

    const categoryName = newCategoryName.trim();

    if (!categoryName) return;

    const existingCategory = Object.keys(skillCategories).some(
      (category) =>
        category.toLowerCase() === categoryName.toLowerCase()
    );

    if (existingCategory) return;

    onChange({
      ...skillCategories,
      [categoryName]: [],
    });

    setNewCategoryName("");
  };

  const handleRemoveCategory = (categoryName) => {
    const updatedSkills = { ...skillCategories };

    delete updatedSkills[categoryName];

    onChange(updatedSkills);
  };

  const handleAddSkillTag = (categoryName) => {
    const skill = (activeInput[categoryName] || "").trim();

    if (!skill) return;

    const currentSkills = skillCategories[categoryName] || [];

    const alreadyExists = currentSkills.some(
      (existingSkill) =>
        existingSkill.toLowerCase() === skill.toLowerCase()
    );

    if (!alreadyExists) {
      onChange({
        ...skillCategories,
        [categoryName]: [...currentSkills, skill],
      });
    }

    setActiveInput((previous) => ({
      ...previous,
      [categoryName]: "",
    }));
  };

  const handleRemoveSkillTag = (categoryName, skillToRemove) => {
    const currentSkills = skillCategories[categoryName] || [];

    onChange({
      ...skillCategories,
      [categoryName]: currentSkills.filter(
        (skill) => skill !== skillToRemove
      ),
    });
  };

  return (
    <div className="dynamic-skills-panel">
      {Object.keys(skillCategories).length === 0 ? (
        <div className="skills-empty-state">
          <Cpu size={24} />
          <p>No skill categories added yet.</p>
          <span>
            Create a category below, then add the skills you want to
            include in your resume.
          </span>
        </div>
      ) : (
        <div className="skill-categories-stack">
          {Object.entries(skillCategories).map(
            ([categoryName, skills]) => (
              <div key={categoryName} className="skill-category-box">
                <div className="skill-category-header">
                  <span className="category-title">
                    <Cpu size={14} />
                    <span>{categoryName}</span>
                  </span>

                  <button
                    type="button"
                    className="btn-delete-cat"
                    title="Remove category"
                    aria-label={`Remove ${categoryName} category`}
                    onClick={() => handleRemoveCategory(categoryName)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="skills-tag-wrap">
                  {skills.map((skill) => (
                    <span key={skill} className="skill-pill">
                      <span>{skill}</span>

                      <button
                        type="button"
                        className="btn-remove-tag"
                        aria-label={`Remove ${skill}`}
                        onClick={() =>
                          handleRemoveSkillTag(categoryName, skill)
                        }
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="add-tag-row">
                  <input
                    type="text"
                    placeholder={`Add skill in ${categoryName}...`}
                    value={activeInput[categoryName] || ""}
                    onChange={(e) =>
                      setActiveInput((previous) => ({
                        ...previous,
                        [categoryName]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkillTag(categoryName);
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="btn-tag-add"
                    onClick={() => handleAddSkillTag(categoryName)}
                  >
                    Add
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}

      <div className="add-category-bar">
        <input
          type="text"
          placeholder="Enter your category name (e.g. AI Agents, Cloud)..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddCategory(e);
            }
          }}
        />

        <button
          type="button"
          className="btn-create-category"
          onClick={handleAddCategory}
        >
          <Plus size={15} />
          <span>Add Category</span>
        </button>
      </div>
    </div>
  );
}