import React, { useState, useEffect, useCallback, useRef } from 'react';
import Editor from './components/Editor';
import ActionBar from './components/ActionBar';
import VersionControl from './components/VersionControl';
import VersionComparison from './components/VersionComparison';
import useVersionHistory from './hooks/useVersionHistory';
import useAnswerGeneration from './hooks/useAnswerGeneration';
import DropdownMenu from '../QuestionSection/DropdownMenu'; // 假设复用现有的 DropdownMenu 组件

export const AnswerSection = ({ 
  question,
  onAnswerGenerated, 
  onSourcesUpdate, 
  isGenerating,
  selectedHistoryQuestion,
  currentAnswer,
  parentName
}) => {
  const {
    loading,
    error,
    answer,
    detailedResponse, // 新增：从钩子中获取详细回答
    simpleResponse,  // 新增：从钩子中获取简洁回答
    sources,
    relationships,
    metadata,
    questionId,
    conversationId,
    generateAnswerFromQuestion,
    updateParentName
  } = useAnswerGeneration();

  const {
    versions,
    currentVersionId,
    setCurrentVersionId,
    addVersion,
    getCurrentVersion,
    toggleLike,
    toggleBookmark,
  } = useVersionHistory(questionId || selectedHistoryQuestion?.id);

  const [editorContent, setEditorContent] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [showComparison, setShowComparison] = useState(false);
  const [currentParentName, setCurrentParentName] = useState(parentName || '');
  const [responseMode, setResponseMode] = useState('simplified'); // 新增：管理用户选择的模式，默认简洁模式
  const processedQuestionRef = useRef('');
  const initialLoadDone = useRef(false);

  const currentVersion = getCurrentVersion();

  // Update currentParentName when parentName prop changes
  useEffect(() => {
    if (parentName !== undefined && parentName !== currentParentName) {
      console.log('🔄 Parent name updated from props:', parentName);
      setCurrentParentName(parentName);
      if (updateParentName) {
        updateParentName(parentName);
      }
    }
  }, [parentName, currentParentName, updateParentName]);

  // Handle new question submissions
  useEffect(() => {
    const handleNewQuestion = async (event) => {
      const { question, parameters, parentName: eventParentName } = event.detail;
      console.log('🔄 Received new question event:', event.detail);
      
      if (eventParentName !== undefined) {
        setCurrentParentName(eventParentName);
      }
      
      try {
        const result = await generateAnswerFromQuestion(question, { 
          parameters,
          parent_name: eventParentName || currentParentName
        });
        if (result) {
          console.log('✅ Answer generated:', result);
          if (onAnswerGenerated) {
            onAnswerGenerated({
              ...result,
              parent_name: eventParentName || currentParentName || result.parent_name
            });
          }
        }
      } catch (error) {
        console.error('❌ Error generating answer:', error);
      }
    };
  
    const element = document.getElementById('answer-section');
    if (element) {
      element.addEventListener('newQuestion', handleNewQuestion);
      return () => {
        element.removeEventListener('newQuestion', handleNewQuestion);
      };
    }
  }, [generateAnswerFromQuestion, onAnswerGenerated, currentParentName]);

  // 修改：根据 responseMode 动态选择展示的内容
  useEffect(() => {
    if (currentAnswer?.isHistoricalAnswer) {
      console.log('📜 Setting content from historical answer');
      const content = responseMode === 'detailed' 
        ? currentAnswer.detailed_response 
        : currentAnswer.simple_response || currentAnswer.detailed_response; // 回退到 detailed_response
      setEditorContent(content);
      setOriginalContent(content);
      
      if (currentAnswer.parent_name) {
        setCurrentParentName(currentAnswer.parent_name);
        if (updateParentName) {
          updateParentName(currentAnswer.parent_name);
        }
      }
      
      if (!initialLoadDone.current && currentAnswer.isHistoricalAnswer) {
        initialLoadDone.current = true;
      } else if (!currentAnswer.isHistoricalAnswer && !versions.some(v => v.content === content)) {
        addVersion(content, 'ai', {
          parent_name: currentAnswer.parent_name || currentParentName
        });
      }
      
      if (onSourcesUpdate) {
        onSourcesUpdate(currentAnswer.sources || []);
      }
    } else if (answer) {
      console.log('🤖 Setting content from new AI answer');
      const content = responseMode === 'detailed' ? detailedResponse : simpleResponse;
      setEditorContent(content);
      setOriginalContent(content);
      if (!versions.length) {
        addVersion(content, 'ai', {
          parent_name: currentParentName
        });
      }
    }
  }, [answer, detailedResponse, simpleResponse, responseMode, currentAnswer, versions, addVersion, onSourcesUpdate, currentParentName, updateParentName]);

  useEffect(() => {
    const selectedVersion = getCurrentVersion();
    if (selectedVersion) {
      setEditorContent(selectedVersion.content);
      if (selectedVersion.metadata?.parent_name) {
        setCurrentParentName(selectedVersion.metadata.parent_name);
        if (updateParentName) {
          updateParentName(selectedVersion.metadata.parent_name);
        }
      }
    }
  }, [currentVersionId, getCurrentVersion, updateParentName]);

  useEffect(() => {
    if (sources && onSourcesUpdate && !currentAnswer?.isHistoricalAnswer) {
      onSourcesUpdate(sources);
    }
  }, [sources, onSourcesUpdate, currentAnswer]);

  // Handle question processing
  useEffect(() => {
    const handleAnswer = async () => {
      if (question && 
          typeof question === 'object' &&  
          question.question !== processedQuestionRef.current &&
          !currentAnswer?.isHistoricalAnswer) {
        
        console.log('🔄 Processing new question:', question);
        processedQuestionRef.current = question.question;
        
        try {
          const options = selectedHistoryQuestion?.isFromHistory ? {
            isHistoricalAnswer: true,
            conversation_id: selectedHistoryQuestion.conversation_id,
            response: selectedHistoryQuestion.response,
            source_data: selectedHistoryQuestion.source_data,
            response_metadata: selectedHistoryQuestion.response_metadata,
            question_id: selectedHistoryQuestion.id,
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName
          } : { 
            parameters: question.parameters,
            parent_name: question.parentName || currentParentName,
            conversation_id: conversationId
          };

          const response = await generateAnswerFromQuestion(question.question, options);
          
          if (response && (response.detailed_response || response.simple_response)) {
            const content = responseMode === 'detailed' 
              ? response.detailed_response 
              : response.simple_response || response.detailed_response; // 回退到 detailed_response
            setEditorContent(content);
            setOriginalContent(content);
            
            if (onAnswerGenerated) {
              onAnswerGenerated({
                id: response.question_id,
                answer: content,
                detailed_response: response.detailed_response, // 传递完整数据
                simple_response: response.simple_response,     // 传递完整数据
                sources: response.sources || [],
                relationships: response.relationships || [],
                metadata: response.metadata || {},
                isHistoricalAnswer: options.isHistoricalAnswer,
                parameters: question.parameters,
                parent_name: response.parent_name || currentParentName
              });
            }
          }
        } catch (error) {
          console.error('Failed to generate answer:', error);
          setEditorContent('Error generating response: ' + error.message);
        }
      }
    };

    handleAnswer();
  }, [question, generateAnswerFromQuestion, onAnswerGenerated, currentAnswer, selectedHistoryQuestion, currentParentName, conversationId, responseMode]);

  const handleReset = useCallback(() => {
    setEditorContent(originalContent);
  }, [originalContent]);

  const handleClear = useCallback(() => {
    setEditorContent('');
  }, []);

  const handleSave = useCallback(() => {
    console.log('Saving version, content:', editorContent?.trim());
    if (editorContent && editorContent.trim()) {
      try {
        const currentQuestionId = questionId || selectedHistoryQuestion?.id;
        if (!currentQuestionId) {
          console.warn('No question ID available for saving version');
          return;
        }
        if (!versions.some(v => v.content === editorContent.trim())) {
          addVersion(editorContent, 'user', {
            parent_name: currentParentName,
            timestamp: new Date().toISOString()
          });
          console.log('Version saved successfully');
        } else {
          console.log('Version with this content already exists');
        }
      } catch (error) {
        console.error('Failed to save version:', error);
      }
    }
  }, [editorContent, addVersion, questionId, selectedHistoryQuestion, versions, currentParentName]);

  const handleCopy = (content) => {
    addVersion(content, 'copy', {
      type: 'copy',
      timestamp: new Date().toISOString(),
      parent_name: currentParentName
    });
  };

  const getPlainTextContent = useCallback((htmlContent) => {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent || tempDiv.innerText || '';
  }, []);

  if (error) {
    return <div className="text-red-500 p-4">Error: {error}</div>;
  }

  return (
    <div id="answer-section" className="h-full flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">VineAI Response</h2>
            {/* 新增：下拉菜单 */}
            <DropdownMenu
              options={[
                { value: 'detailed', label: 'Detailed' },
                { value: 'simplified', label: 'Simplified' },
              ]}
              value={responseMode}
              onChange={(value) => setResponseMode(value)}
            />
          </div>
          
          {currentParentName && (
            <div className="mb-3 text-sm text-gray-600">
              <span className="font-medium">Parent:</span> {currentParentName}
            </div>
          )}
          
          <div className="flex-1 overflow-hidden">
            {loading || isGenerating ? (
              <div className="animate-pulse h-full bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                <div className="h bahasa://github.com/4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <Editor
                value={editorContent}
                onChange={setEditorContent}
                onReset={handleReset}
                onClear={handleClear}
              />
            )}
          </div>
        </div>
        <ActionBar
          onSave={handleSave}
          onLike={() => toggleLike(currentVersionId)}
          onBookmark={() => toggleBookmark(currentVersionId)}
          isLiked={currentVersion?.isLiked}
          isBookmarked={currentVersion?.isBookmarked}
          textToCopy={getPlainTextContent(editorContent)}
          metadata={metadata}
          onCopy={handleCopy}
          parentName={currentParentName}
        />
        {showComparison && (
          <VersionComparison
            originalText={versions[0]?.content || ''}
            modifiedText={editorContent}
          />
        )}
      </div>
      <VersionControl
        versions={versions}
        currentVersion={currentVersionId}
        onVersionSelect={setCurrentVersionId}
      />
    </div>
  );
};

export default AnswerSection;